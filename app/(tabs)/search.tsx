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
import { Ionicons } from '@expo/vector-icons';

// Helper function to clean LOT numbers from suffixes
function cleanLotNumber(lot: string) {
  if (!lot) return '';
  return lot.replace(/-\d+$/, '');
}

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

    // Fetch active yarn rolls (in_stock) with their storage area
    const { data, error } = await supabase
      .from('yarn_rolls')
      .select('id, yarn_code, area_id, status, updated_at, areas(id, code, label)')
      .eq('status', 'in_stock')
      .not('area_id', 'is', null)
      .ilike('yarn_code', `%${query.trim()}%`)
      .order('updated_at', { ascending: false })
      .limit(30);

    setLoading(false);

    if (!error) {
      setResults((data as unknown as YarnRoll[]) || []);
    } else {
      console.error('Search error:', error.message);
      setResults([]);
    }
  }

  function handleResultPress(item: YarnRoll) {
    const areaId = (item as any).areas?.id;
    const baseLot = cleanLotNumber(item.yarn_code);
    if (areaId) {
      // Navigate directly to the rack location on the Board with lot highlight
      router.push({
        pathname: '/(tabs)',
        params: { openAreaId: areaId, searchLot: baseLot },
      });
    }
  }

  function renderResult({ item }: { item: YarnRoll }) {
    const areaCode = (item as any).areas?.code ?? 'Unknown';

    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => handleResultPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultLeft}>
          <Text style={styles.lotCode}>LOT: {cleanLotNumber(item.yarn_code)}</Text>
        </View>
        <View style={styles.resultRight}>
          <View style={styles.areaBadge}>
            <Ionicons name="location-outline" size={11} color="#ffffff" style={{ marginRight: 2 }} />
            <Text style={styles.areaTag}>{areaCode}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchRow}>
        <View style={styles.inputContainer}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter LOT number (e.g. K446)"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="characters"
            placeholderTextColor="#94a3b8"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Results List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#0f172a" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderResult}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#cbd5e1" />
                <Text style={styles.empty}>No active LOTs found for "{query}"</Text>
                <Text style={styles.emptySub}>Please verify the LOT number or check if it was retrieved.</Text>
              </View>
            ) : (
              <View style={styles.hintContainer}>
                <Ionicons name="barcode-outline" size={64} color="#e2e8f0" />
                <Text style={styles.hintTitle}>LOT Number Lookup</Text>
                <Text style={styles.hint}>
                  Type a LOT number above and tap Search. Tapping a result will navigate to its rack location on the Board.
                </Text>
              </View>
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
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    height: 42,
  },
  searchIcon: { marginRight: 6 },
  clearIcon: { padding: 4 },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    paddingVertical: 0,
  },
  searchButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 16,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { padding: 12 },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  resultLeft: { flex: 1 },
  lotCode: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
  resultRight: { alignItems: 'flex-end' },
  areaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  areaTag: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

  // Empty states
  emptyContainer: { alignItems: 'center', marginTop: 60, padding: 20 },
  empty: { textAlign: 'center', color: '#64748b', fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptySub: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginTop: 4, paddingHorizontal: 20 },

  hintContainer: { alignItems: 'center', marginTop: 60, padding: 24 },
  hintTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
  hint: { textAlign: 'center', color: '#94a3b8', fontSize: 13, lineHeight: 18, paddingHorizontal: 12 },
});
