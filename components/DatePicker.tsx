import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  visible: boolean;
  currentDate: string; // YYYY-MM-DD
  onSelect: (dateStr: string) => void;
  onClose: () => void;
  title?: string;
  minDate?: string;
  maxDate?: string;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DatePicker({
  visible,
  currentDate,
  onSelect,
  onClose,
  title = 'Select Date',
  minDate,
  maxDate,
}: DatePickerProps) {
  // Init view month/year from currentDate or now
  const initDate = currentDate && currentDate.length === 10 ? new Date(currentDate) : new Date();
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [viewYear, setViewYear] = useState(initDate.getFullYear());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const isDateDisabled = (year: number, month: number, day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && dStr < minDate) return true;
    if (maxDate && dStr > maxDate) return true;
    return false;
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

    const cells = [];
    // empty slots for offset
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.cell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dStr === currentDate;
      const disabled = isDateDisabled(viewYear, viewMonth, day);

      cells.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[styles.cell, isSelected && styles.cellSelected, disabled && styles.cellDisabled]}
          disabled={disabled}
          onPress={() => onSelect(dStr)}
        >
          <Text style={[styles.cellText, isSelected && styles.cellTextSelected, disabled && styles.cellTextDisabled]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.grid}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
        {cells}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.ctrlBtn}>
              <Ionicons name="chevron-back" size={20} color="#1e293b" />
            </TouchableOpacity>
            <Text style={styles.monthText}>{months[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.ctrlBtn}>
              <Ionicons name="chevron-forward" size={20} color="#1e293b" />
            </TouchableOpacity>
          </View>

          {renderCalendar()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  closeBtn: { padding: 4 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctrlBtn: { padding: 8, backgroundColor: '#f1f5f9', borderRadius: 8 },
  monthText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  cellSelected: {
    backgroundColor: '#1b4d3e',
  },
  cellDisabled: {
    opacity: 0.3,
  },
  cellText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  cellTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  cellTextDisabled: {
    color: '#cbd5e1',
  },
});
