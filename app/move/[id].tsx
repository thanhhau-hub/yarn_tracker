import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Area, YarnRoll } from '../../types';

/**
 * Move Yarn Screen
 * The worker selects a destination area for a yarn roll.
 * On confirm: updates yarn_rolls.area_id AND inserts a move_log row.
 * Route: /move/[id]   (id = yarn roll id)
 */
export default function MoveYarnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [yarn, setYarn] = useState<YarnRoll | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      // Load the yarn roll with its current area
      const { data: yarnData } = await supabase
        .from('yarn_rolls')
        .select('*, areas(id, code)')
        .eq('id', id)
        .single();

      // Load all active areas except the current one
      const { data: areaData } = await supabase
        .from('areas')
        .select('*')
        .eq('is_active', true)
        .order('code');

      setYarn(yarnData);
      // Filter out the area the yarn is already in
      setAreas((areaData || []).filter((a: Area) => a.id !== yarnData?.area_id));
      setLoading(false);
    }
    loadData();
  }, [id]);

  async function handleMove() {
    if (!selectedAreaId || !yarn) return;

    Alert.alert(
      'Confirm Move',
      `Move ${yarn.yarn_code} to area ${areas.find(a => a.id === selectedAreaId)?.code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving(true);

            const { data: { user } } = await supabase.auth.getUser();

            // Step 1: Log the move FIRST (for data integrity)
            const { error: logError } = await supabase.from('move_logs').insert({
              yarn_roll_id: yarn.id,
              from_area_id: yarn.area_id,
              to_area_id: selectedAreaId,
              moved_by: user?.id,
            });

            if (logError) {
              Alert.alert('Error', 'Failed to log the move. Please try again.');
              setSaving(false);
              return;
            }

            // Step 2: Update the yarn's current position
            const { error: updateError } = await supabase
              .from('yarn_rolls')
              .update({ area_id: selectedAreaId, updated_at: new Date().toISOString() })
              .eq('id', yarn.id);

            setSaving(false);

            if (updateError) {
              Alert.alert('Error', 'Move logged but position update failed. Contact admin.');
              return;
            }

            // Success — go back to the board
            Alert.alert('✅ Moved!', `${yarn.yarn_code} is now in the new area.`, [
              { text: 'OK', onPress: () => router.push('/') },
            ]);
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2e5c3e" />
      </View>
    );
  }

  if (!yarn) {
    return (
      <View style={styles.centered}>
        <Text>Yarn roll not found.</Text>
      </View>
    );
  }

  const currentAreaCode = (yarn as any).areas?.code ?? 'Unknown';

  return (
    <View style={styles.container}>
      {/* Current yarn info */}
      <View style={styles.yarnInfo}>
        <Text style={styles.yarnCode}>{yarn.yarn_code}</Text>
        <Text style={styles.currentArea}>Currently in: {currentAreaCode}</Text>
      </View>

      <Text style={styles.instruction}>Select destination area:</Text>

      {/* Area picker */}
      <FlatList
        data={areas}
        keyExtractor={(item) => item.id}
        numColumns={4}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.areaCard,
              selectedAreaId === item.id && styles.areaCardSelected,
            ]}
            onPress={() => setSelectedAreaId(item.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.areaCode,
                selectedAreaId === item.id && styles.areaCodeSelected,
              ]}
            >
              {item.code}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Confirm button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, (!selectedAreaId || saving) && styles.confirmButtonDisabled]}
          onPress={handleMove}
          disabled={!selectedAreaId || saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmButtonText}>
              {selectedAreaId
                ? `Move to ${areas.find(a => a.id === selectedAreaId)?.code}`
                : 'Select an area first'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  yarnInfo: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  yarnCode: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  currentArea: { fontSize: 14, color: '#64748b', marginTop: 4 },
  instruction: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    padding: 16,
    paddingBottom: 8,
  },
  grid: { padding: 4, paddingBottom: 100 },
  areaCard: {
    flex: 1,
    margin: 4,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    minHeight: 50,
    justifyContent: 'center',
  },
  areaCardSelected: { backgroundColor: '#2e5c3e', borderColor: '#2e5c3e' },
  areaCode: { fontSize: 12, fontWeight: '700', color: '#475569' },
  areaCodeSelected: { color: '#fff' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  confirmButton: {
    backgroundColor: '#2e5c3e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  confirmButtonDisabled: { backgroundColor: '#89b096' },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
