import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './boardStyles';

interface SearchBarProps {
  searchLotInput: string;
  searchColorInput: string;
  searchDescInput: string;
  activeLot: string;
  activeColor: string;
  activeDesc: string;
  isSearchActive: boolean;
  setSearchLotInput: (t: string) => void;
  setSearchColorInput: (t: string) => void;
  setSearchDescInput: (t: string) => void;
  handleSearchScroll: (lot: string, col: string, desc: string) => void;
  handleClearSearch: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchLotInput,
  searchColorInput,
  searchDescInput,
  activeLot,
  activeColor,
  activeDesc,
  isSearchActive,
  setSearchLotInput,
  setSearchColorInput,
  setSearchDescInput,
  handleSearchScroll,
  handleClearSearch,
}) => {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="barcode-outline" size={14} color="#718096" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Lot" 
            value={searchLotInput} 
            onChangeText={(t) => { setSearchLotInput(t); handleSearchScroll(t, searchColorInput, searchDescInput); }} 
            autoCapitalize="characters" 
            placeholderTextColor="#a0aec0" 
          />
        </View>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="color-palette-outline" size={14} color="#718096" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Color" 
            value={searchColorInput} 
            onChangeText={(t) => { setSearchColorInput(t); handleSearchScroll(searchLotInput, t, searchDescInput); }} 
            autoCapitalize="none" 
            placeholderTextColor="#a0aec0" 
          />
        </View>
        <View style={[styles.searchInputWrapper, { marginRight: 0 }]}>
          <Ionicons name="text-outline" size={14} color="#718096" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Desc" 
            value={searchDescInput} 
            onChangeText={(t) => { setSearchDescInput(t); handleSearchScroll(searchLotInput, searchColorInput, t); }} 
            autoCapitalize="none" 
            placeholderTextColor="#a0aec0" 
          />
        </View>
      </View>
      {isSearchActive && (
        <View style={styles.searchHintRow}>
          <Text style={styles.searchHint} numberOfLines={1}>
            {[activeLot ? `Lot: ${activeLot}` : '', activeColor ? `Color: ${activeColor}` : '', activeDesc ? `Desc: ${activeDesc}` : ''].filter(Boolean).join('  ·  ')}
          </Text>
          <TouchableOpacity onPress={handleClearSearch} style={styles.searchClearPill}>
            <Ionicons name="close" size={10} color="#065f46" />
            <Text style={styles.searchClearPillText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
