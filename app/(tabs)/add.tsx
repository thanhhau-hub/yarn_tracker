import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Area } from '../../types';

/**
 * Add New LOT Screen
 * Workers register a new LOT when it arrives on the floor.
 * They enter the LOT number and select the storage area.
 */
export default function AddYarnScreen() {
  const router = useRouter();
  const [lotNumber, setLotNumber] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch all active areas for the area picker
  useEffect(() => {
    async function loadAreas() {
      setLoading(true);
      const { data } = await supabase
        .from('areas')
        .select('*')
        .eq('is_active', true)
        .order('code');
      setAreas(data || []);
      setLoading(false);
    }
    loadAreas();
  }, []);

  async function handleSave() {
    const baseCode = lotNumber.trim().toUpperCase();
    if (!baseCode) {
      Alert.alert('Required', 'Please enter a LOT number.');
      return;
    }
    if (!selectedAreaId) {
      Alert.alert('Required', 'Please select a storage area.');
      return;
    }

    setSaving(true);

    let finalCode = baseCode;
    try {
      // Find matching codes starting with baseCode to determine duplicate suffix
      const { data: matches, error: fetchError } = await supabase
        .from('yarn_rolls')
        .select('yarn_code')
        .ilike('yarn_code', `${baseCode}%`);

      if (fetchError) {
        Alert.alert('Error', fetchError.message);
        setSaving(false);
        return;
      }

      if (matches && matches.length > 0) {
        const regex = new RegExp(`^${baseCode}(-\\d+)?$`);
        const matchedCodes = matches
          .map((m) => m.yarn_code)
          .filter((c) => regex.test(c));

        if (matchedCodes.length > 0) {
          let maxIndex = 1;
          matchedCodes.forEach((c) => {
            if (c === baseCode) {
              maxIndex = Math.max(maxIndex, 1);
            } else {
              const parts = c.split('-');
              const index = parseInt(parts[parts.length - 1], 10);
              if (!isNaN(index)) {
                maxIndex = Math.max(maxIndex, index);
              }
            }
          });
          finalCode = `${baseCode}-${maxIndex + 1}`;
        }
      }

      // Insert the new yarn roll (LOT)
      const { data: newYarn, error: insertError } = await supabase
        .from('yarn_rolls')
        .insert({
          yarn_code: finalCode,
          area_id: selectedAreaId,
          status: 'in_stock',
        })
        .select()
        .single();

      if (insertError) {
        Alert.alert('Error', insertError.message);
        setSaving(false);
        return;
      }

      // Log the initial placement
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('move_logs').insert({
        yarn_roll_id: newYarn.id,
        from_area_id: null,       // null = came from outside
        to_area_id: selectedAreaId,
        moved_by: user?.id,
        note: 'Initial placement',
      });

      setSaving(false);
      Alert.alert('✅ Success', `LOT ${baseCode} registered successfully!`, [
        { text: 'Add Another', onPress: () => { setLotNumber(''); setSelectedAreaId(null); } },
        { text: 'Go to Board', onPress: () => router.push('/') },
      ]);
    } catch (err: any) {
      Alert.alert('System Error', err.message || 'An unexpected error occurred.');
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Register New LOT</Text>

      <Text style={styles.label}>LOT Number *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. K446, 3310"
        value={lotNumber}
        onChangeText={setLotNumber}
        autoCapitalize="characters"
      />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Storage Area *</Text>
      <Text style={styles.hint}>Select where this LOT will be stored:</Text>

      {loading ? (
        <ActivityIndicator color="#0f172a" style={{ marginTop: 16 }} />
      ) : (
        <View style={styles.areaGrid}>
          {areas.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={[
                styles.areaChip,
                selectedAreaId === area.id && styles.areaChipSelected,
              ]}
              onPress={() => setSelectedAreaId(area.id)}
            >
              <Text
                style={[
                  styles.areaChipText,
                  selectedAreaId === area.id && styles.areaChipTextSelected,
                ]}
              >
                {area.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>✅ Save LOT Position</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  hint: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  areaChip: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  areaChipSelected: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  areaChipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  areaChipTextSelected: { color: '#fff' },
  saveButton: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: { backgroundColor: '#64748b' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
