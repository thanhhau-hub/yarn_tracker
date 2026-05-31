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
 * Add New Yarn Screen
 * Workers register a new yarn roll when it arrives on the floor.
 * They enter the yarn code, select the storage area, and optionally
 * add color/type details.
 */
export default function AddYarnScreen() {
  const router = useRouter();
  const [yarnCode, setYarnCode] = useState('');
  const [color, setColor] = useState('');
  const [type, setType] = useState('');
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
    if (!yarnCode.trim()) {
      Alert.alert('Required', 'Please enter a yarn code.');
      return;
    }
    if (!selectedAreaId) {
      Alert.alert('Required', 'Please select a storage area.');
      return;
    }

    setSaving(true);

    // Check if this yarn code already exists
    const { data: existing } = await supabase
      .from('yarn_rolls')
      .select('id')
      .eq('yarn_code', yarnCode.trim().toUpperCase())
      .single();

    if (existing) {
      Alert.alert('Duplicate', `Yarn code "${yarnCode.toUpperCase()}" already exists in the system.`);
      setSaving(false);
      return;
    }

    // Insert the new yarn roll
    const { data: newYarn, error } = await supabase
      .from('yarn_rolls')
      .insert({
        yarn_code: yarnCode.trim().toUpperCase(),
        color: color.trim() || null,
        type: type.trim() || null,
        area_id: selectedAreaId,
        status: 'in_stock',
      })
      .select()
      .single();

    if (error) {
      Alert.alert('Error', error.message);
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
    Alert.alert('✅ Success', `Yarn ${newYarn.yarn_code} added successfully!`, [
      { text: 'Add Another', onPress: () => { setYarnCode(''); setColor(''); setType(''); setSelectedAreaId(null); } },
      { text: 'Go to Board', onPress: () => router.push('/') },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Yarn Details</Text>

      <Text style={styles.label}>Yarn Code *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. YRN-0042"
        value={yarnCode}
        onChangeText={setYarnCode}
        autoCapitalize="characters"
      />

      <Text style={styles.label}>Color</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Red, Blue, Natural"
        value={color}
        onChangeText={setColor}
      />

      <Text style={styles.label}>Type / Specification</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Polyester 30/1, Cotton Ne40"
        value={type}
        onChangeText={setType}
      />

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Storage Area *</Text>
      <Text style={styles.hint}>Select where this yarn roll will be stored:</Text>

      {loading ? (
        <ActivityIndicator color="#2e5c3e" style={{ marginTop: 16 }} />
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
          <Text style={styles.saveButtonText}>✅ Save Yarn Roll</Text>
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
  areaChipSelected: { backgroundColor: '#2e5c3e', borderColor: '#2e5c3e' },
  areaChipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  areaChipTextSelected: { color: '#fff' },
  saveButton: {
    backgroundColor: '#2e5c3e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonDisabled: { backgroundColor: '#89b096' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
