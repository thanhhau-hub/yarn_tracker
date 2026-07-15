import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { AreaWithCount } from '../../types';
import { styles, cleanLotNumber } from './boardStyles';

interface LotActionModalProps {
  visible: boolean;
  displayArea: AreaWithCount | null;
  role: string | null;
  isOnline: boolean;
  onClose: () => void;
  onEdit: (yarn: any) => void;
  onDelete: (yarn: any, areaCode: string) => void;
  onAddLot: (areaId: string, areaCode: string) => void;
}

export const LotActionModal: React.FC<LotActionModalProps> = ({
  visible,
  displayArea,
  role,
  isOnline,
  onClose,
  onEdit,
  onDelete,
  onAddLot,
}) => {
  
  const [checkedYarns, setCheckedYarns] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!visible || !displayArea?.yarns) return;
    setCheckedYarns((prev) =>
      displayArea.yarns!.reduce((next, yarn) => {
        next[yarn.id] = prev[yarn.id] ?? !!yarn.is_checked;
        return next;
      }, {} as Record<string, boolean>)
    );
  }, [visible, displayArea?.yarns]);

  if (!visible || !displayArea) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{displayArea?.code}</Text>
              <Text style={styles.modalSubtitle}>{displayArea?.yarn_count ? `${displayArea.yarn_count} LOT(s) stored` : 'Empty rack'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeModalButton}><Ionicons name="close" size={22} color="#64748b" /></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            <View style={styles.modalContent}>
              {displayArea?.yarns && displayArea.yarns.length > 0 ? (
                displayArea.yarns.map((yarn) => {
                  const cleanedLot = cleanLotNumber(yarn.yarn_code);
                  return (
                    <View key={yarn.id} style={styles.lotDetailCard}>
                      <View style={[styles.lotDetailHeader, styles.lotDetailHeaderWithCheckbox]}>
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                          <Ionicons name="cube-outline" size={16} color="#1b4d3e" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.lotDetailText}>LOT: {cleanedLot}</Text>
                            {yarn.color && <View style={styles.lotDetailMeta}><Ionicons name="color-palette-outline" size={11} color="#64748b" /><Text style={styles.lotDetailMetaText}>{yarn.color}</Text></View>}
                            {yarn.description && <View style={styles.lotDetailMeta}><Ionicons name="text-outline" size={11} color="#64748b" /><Text style={styles.lotDetailMetaText}>{yarn.description}</Text></View>}
                          </View>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.supervisorCheckbox,
                            checkedYarns[yarn.id] && styles.supervisorCheckboxChecked,
                            !(role === 'supervisor' || role === 'admin') && styles.supervisorCheckboxDisabled,
                          ]}
                          onPress={async () => {
                            if (!(role === 'supervisor' || role === 'admin')) return;
                            const nextChecked = !checkedYarns[yarn.id];
                            setCheckedYarns((prev) => ({
                              ...prev,
                              [yarn.id]: nextChecked,
                            }));

                            const { error } = await supabase
                              .from('yarn_rolls')
                              .update({ is_checked: nextChecked })
                              .eq('id', yarn.id);
                            if (error) {
                              setCheckedYarns((prev) => ({
                                ...prev,
                                [yarn.id]: !nextChecked,
                              }));
                              Alert.alert('Lỗi', 'Không lưu được trạng thái đã đánh dấu.');
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          {checkedYarns[yarn.id] ? <Ionicons name="close" size={14} color="#ffffff" /> : null}
                        </TouchableOpacity>
                      </View>
                      <View style={styles.lotActions}>
                        {(role === 'supervisor' || role === 'admin') && (
                          <>
                            {/* Nút Edit: Tự động mờ đi (opacity 0.5) và bị vô hiệu hóa khi offline */}
                            <TouchableOpacity 
                              style={[
                                styles.actionBtnPrimary, 
                                { backgroundColor: '#e8f0fe' },
                                !isOnline && { backgroundColor: '#f1f5f9', opacity: 0.5 }
                              ]} 
                              disabled={!isOnline}
                              onPress={() => onEdit(yarn)}
                            >
                              <Ionicons name="create-outline" size={14} color={isOnline ? "#1a73e8" : "#94a3b8"} />
                              <Text style={[styles.actionBtnPrimaryText, { color: isOnline ? '#1a73e8' : '#94a3b8' }]}>Edit</Text>
                            </TouchableOpacity>

                            {/* Nút Delete: Tự động mờ đi (opacity 0.5) và bị vô hiệu hóa khi offline */}
                            <TouchableOpacity 
                              style={[
                                styles.actionBtnDelete,
                                !isOnline && { backgroundColor: '#f1f5f9', opacity: 0.5 }
                              ]} 
                              disabled={!isOnline}
                              onPress={() => onDelete(yarn, displayArea?.code || '')}
                            >
                              <Ionicons name="trash-outline" size={14} color={isOnline ? "#c5221f" : "#94a3b8"} />
                              <Text style={[styles.actionBtnDeleteText, { color: isOnline ? '#c5221f' : '#94a3b8' }]}>Delete</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyRackContainer}>
                  <Ionicons name="cube-outline" size={36} color="#cbd5e1" />
                  <Text style={styles.emptyRackText}>This rack is empty</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Nút Add Lot màu xanh lá ở footer: Tự động mờ đi và bị vô hiệu hóa khi offline */}
          {(role === 'supervisor' || role === 'admin') ? (
            <TouchableOpacity 
              style={[
                styles.modalAddFooterBtn,
                !isOnline && { backgroundColor: '#f1f5f9', borderTopColor: '#e2e8f0', opacity: 0.5 }
              ]} 
              disabled={!isOnline}
              onPress={() => onAddLot(displayArea?.id || '', displayArea?.code || '')}
            >
              <Ionicons name="add-circle-outline" size={16} color={isOnline ? "#137333" : "#94a3b8"} />
              <Text style={[styles.modalAddFooterText, { color: isOnline ? '#137333' : '#94a3b8' }]}>Add Lot</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.modalCloseFooterBtn} onPress={onClose}>
              <Text style={styles.modalCloseFooterText}>Close</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};
