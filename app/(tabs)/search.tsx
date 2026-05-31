import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { YarnRoll } from '../../types';

/**
 * Search Screen
 * Workers can search for a yarn roll by its code.
 * Results show which area the yarn is currently in.
 * Tapping a result goes to the Yarn History / detail screen.
 */
export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<YarnRoll[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('yarn_rolls')
      .select('*, areas(id, code, label)')
      .ilike('yarn_code', `%${query.trim()}%`) // case-insensitive partial match
      .order('updated_at', { ascending: false })
      .limit(20);

    setLoading(false);

    if (!error) {
      setResults(data || []);
    }
  }

  function renderResult({ item }: { item: YarnRoll }) {
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => router.push(`/yarn/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.resultLeft}>
          <Text style={styles.yarnCode}>{item.yarn_code}</Text>
          <Text style={styles.yarnMeta}>
            {[item.color, item.type].filter(Boolean).join(' · ') || 'No details'}
          </Text>
        </View>
        <View style={styles.resultRight}>
          <Text style={styles.areaTag}>
            {(item as any).areas?.code ?? '—'}
          </Text>
          <Text style={styles.statusTag}>{item.status}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Enter yarn code (e.g. YRN-0042)"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#2e5c3e" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              <Text style={styles.empty}>No yarn rolls found for "{query}"</Text>
            ) : (
              <Text style={styles.hint}>
                Type a yarn code above and press Search.{'\n'}You can search by partial code.
              </Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  searchButton: {
    backgroundColor: '#2e5c3e',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  resultLeft: { flex: 1 },
  yarnCode: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  yarnMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  resultRight: { alignItems: 'flex-end', gap: 4 },
  areaTag: {
    backgroundColor: '#2e5c3e',
    color: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 13,
    fontWeight: '700',
  },
  statusTag: { fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
  hint: { textAlign: 'center', color: '#b0b8c4', marginTop: 40, lineHeight: 22, padding: 24 },
});
