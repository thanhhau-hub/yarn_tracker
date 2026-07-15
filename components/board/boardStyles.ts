import { StyleSheet, Platform } from 'react-native';

export function cleanLotNumber(lot: string) {
  if (!lot) return '';
  return lot.replace(/-\d+$/, '');
}

export const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1b4d3e', alignItems: 'center' },
  
  mainAppContainer: { 
    flex: 1, 
    width: '100%', 
    alignSelf: 'center', 
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
    backgroundColor: '#1b4d3e',
  },
  headerLeft: { flex: 1, minWidth: 0 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  headerSub: { fontSize: 9, color: '#a7f3d0', fontWeight: '600' },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleWorker: { backgroundColor: '#475569' },
  roleSupervisor: { backgroundColor: '#d97706' },
  roleAdmin: { backgroundColor: '#dc2626' },
  roleBadgeText: { color: '#ffffff', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  menuButton: {
    padding: 4,
  },

  logoutButtonOutside: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#bfbdbd',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutButtonOutsideText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuBoundingBox: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    position: 'relative',
  },
  menuContent: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.15)' },
      default: { shadowColor: '#000', shadowOpacity: 0.15, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 8 }
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 4,
  },

  searchContainer: {
    backgroundColor: '#1b4d3e',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#143c30',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 8,
    height: 34,
    marginRight: 6,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: { marginRight: 4, flexShrink: 0 },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1e293b',
    paddingVertical: 0,
    height: '100%',
    minWidth: 0,
  },
  searchHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingHorizontal: 2,
  },
  searchHint: {
    flex: 1,
    fontSize: 10,
    color: '#a7f3d0',
    fontWeight: '600',
  },
  searchClearPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#a7f3d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  searchClearPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },

  listContent: { paddingBottom: 16, paddingLeft: 8, paddingRight: 8 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center' },

  sectionHeader: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    marginTop: 8,
    borderRadius: 4,
  },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, paddingRight: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2e7d32' },
  sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 1, color: '#1b5e20', flexShrink: 1 },
  sectionCount: { fontSize: 10, fontWeight: '700', color: '#2e7d32', flexShrink: 0 },

  rowGrid: { flexDirection: 'row', gap: 4, paddingVertical: 1 },

  rackCell: {
    borderRadius: 6,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 1px 2px rgba(27,77,62,0.04)' },
      default: { shadowColor: '#1b4d3e', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }
    }),
  },
  rackCellTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  highlightedCell: {
    ...Platform.select({
      web: { boxShadow: '0px 2px 4px rgba(46,125,50,0.3)' },
      default: { shadowColor: '#2e7d32', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }
    }),
  },
  cellLocation: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  cellLine1Container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    position: 'relative',
  },
  badgeContainer: {
    position: 'absolute',
    right: 2,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  cellLot: { fontSize: 13, textAlign: 'center', marginTop: 1 },
  lotsWrapper: {
    alignItems: 'center',
    width: '100%',
    marginTop: 0,
  },
  cellLotGrid: {
    fontSize: 12,
    textAlign: 'center',
  },
  cellMeta: {
    fontSize: 8,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
    paddingHorizontal: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0px 4px 10px rgba(0,0,0,0.25)' },
      default: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 10 }
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#1b5e20' },
  modalSubtitle: { fontSize: 10, color: '#64748b', marginTop: 2 },
  closeModalButton: { padding: 4 },
  modalScroll: { maxHeight: 520 },
  modalContent: { padding: 12 },

  lotDetailCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
    gap: 10,
  },
  lotDetailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  lotDetailHeaderWithCheckbox: {
    alignItems: 'center',
  },
  supervisorCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.8,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  supervisorCheckboxChecked: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  supervisorCheckboxDisabled: {
    opacity: 0.6,
  },
  lotDetailText: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  lotDetailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  lotDetailMetaText: { fontSize: 12, color: '#64748b', fontWeight: '500', flexShrink: 1 },

  lotActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  actionBtnPrimary: {
    flex: 1,
    minWidth: 65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnPrimaryText: { fontSize: 11, fontWeight: '700' },
  actionBtnDelete: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fce8e6', // Màu đỏ nhạt Google Material
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnDeleteText: { color: '#c5221f', fontSize: 11, fontWeight: '700' }, // Chữ màu đỏ đậm

  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0px 8px 12px rgba(0,0,0,0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }
    }),
  },
  confirmIconRow: { alignItems: 'center', marginBottom: 12 },
  confirmIconBgDelete: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fce8e6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: { fontSize: 18, fontWeight: '800', color: '#c5221f', textAlign: 'center', marginBottom: 4 },
  confirmDetails: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confirmLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  confirmValue: { fontSize: 14, color: '#0f172a', fontWeight: '800' },
  confirmLocation: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: 'hidden',
  },
  confirmDivider: { height: 1, backgroundColor: '#e2e8f0' },
  confirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  btnCancel: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  btnCancelText: { color: '#475569', fontSize: 13, fontWeight: '700' },
  btnDeleteConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#c5221f',
    minWidth: 90,
    alignItems: 'center',
  },
  btnConfirmText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  addLotErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  addLotErrorText: { flex: 1, fontSize: 12, color: '#dc2626', fontWeight: '600', lineHeight: 18 },

  editCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: { boxShadow: '0px 8px 12px rgba(0,0,0,0.2)' },
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8 }
    }),
  },
  editModalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  fieldWrapper: { marginBottom: 14 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase' },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  btnSaveEdit: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },

  emptyRackContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyRackText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

  modalCloseFooterBtn: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalCloseFooterText: { fontSize: 12, color: '#475569', fontWeight: '700' },

  modalAddFooterBtn: {
    backgroundColor: '#e6f4ea', // Màu nền xanh lá nhạt Google Material
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#c8e6c9', // Viền mỏng xanh nhạt
  },
  modalAddFooterText: { fontSize: 13, color: '#137333', fontWeight: '800' }, // Chữ xanh lá đậm

  areaMgmtScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f1f5f9',
    zIndex: 100,
    elevation: 100,
  },
  areaMgmtHeader: {
    backgroundColor: '#1b4d3e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  areaMgmtTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  areaMgmtBackBtn: {
    padding: 4,
    borderRadius: 6,
  },
  areaMgmtBody: {
    padding: 16,
  },

  switchBanner: {
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  switchBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400e',
    marginBottom: 2,
  },
  switchBannerSub: {
    fontSize: 12,
    color: '#b45309',
    marginBottom: 12,
  },
  switchBannerActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  switchCancelBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  switchCancelText: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  switchConfirmBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 7,
    backgroundColor: '#d97706',
  },
  switchConfirmText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  modeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 360,
    ...Platform.select({
      web: { boxShadow: '0px 2px 6px rgba(0,0,0,0.04)' },
      default: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }
    }),
  },
  modeRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  modeRowActive: {
    backgroundColor: '#1b4d3e',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#ffffff',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: '#ffffff',
  },
  modeLabelDim: {
    color: '#94a3b8',
  },

  areaMgmtFormCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...Platform.select({
      web: { boxShadow: '0px 2px 6px rgba(0,0,0,0.04)' },
      default: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }
    }),
  },
  areaMgmtFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    marginBottom: 5,
    marginTop: 2,
  },
  areaMgmtInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    fontWeight: '600',
  },

  validationError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  validationErrorText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
  previewText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },

  areaMgmtActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  areaMgmtDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  areaMgmtDeleteBtnText: {
    color: '#dc2626',
    fontSize: 13,
    fontWeight: '700',
  },
  areaMgmtCreateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#059669',
  },
  areaMgmtCreateBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  areaMgmtBtnDisabled: {
    opacity: 0.4,
  },
});
