import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// ─── Types ──────────────────────────────────────────────
interface ReportData {
  companyName: string;
  companyLogoUrl?: string;
  reportNumber: string;
  maintenanceId: string;
  closedAt: string;
  technicianName: string;
  duration: string;
  client: {
    name: string;
    location: string | null;
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
    nextMaintenanceBaseAt: string | null;
    nextMaintenanceAgreedAt: string | null;
    nextMaintenanceAt: string | null;
  };
  items: Array<{
    equipmentName: string;
    categoryName: string | null;
    identifier: string | null; // IP, MAC, or serial
    actionTypeName: string | null;
    actionTypeColor: string | null;
    observations: string | null;
    photoCount: number;
    completed: boolean;
  }>;
  photos: Array<{
    data: string; // base64 data URL
    caption: string;
  }>;
  clientSignatureData: string | null; // base64 data URL
  technicianSignatureData: string | null; // base64 data URL
  notes: string | null;
}

// ─── Styles ─────────────────────────────────────────────
const BRAND_COLOR = "#2563eb";
const BRAND_LIGHT = "#eff6ff";
const TEXT_PRIMARY = "#1e293b";
const TEXT_SECONDARY = "#64748b";
const TEXT_MUTED = "#94a3b8";
const BORDER_COLOR = "#e2e8f0";
const SUCCESS_COLOR = "#16a34a";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: TEXT_PRIMARY,
  },
  // ─── Header ─────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_COLOR,
  },
  headerLeft: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR,
  },
  reportSubtitle: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  logo: {
    width: 48,
    height: 48,
  },
  // ─── Metadata grid ──────────────────────────────────
  metadataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    backgroundColor: BRAND_LIGHT,
    borderRadius: 4,
    padding: 12,
  },
  metadataItem: {
    width: "25%",
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 7,
    color: TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    marginTop: 1,
  },
  // ─── Section ────────────────────────────────────────
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: BRAND_COLOR,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  // ─── Client section ─────────────────────────────────
  clientName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  clientField: {
    flexDirection: "row",
    marginBottom: 3,
  },
  clientLabel: {
    fontSize: 9,
    color: TEXT_MUTED,
    width: 80,
  },
  clientValue: {
    fontSize: 9,
    color: TEXT_PRIMARY,
    flex: 1,
  },
  // ─── Next maintenance dates ─────────────────────────
  datesRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  dateBadge: {
    padding: 6,
    borderRadius: 4,
    flex: 1,
  },
  dateBadgeBase: {
    backgroundColor: "#f1f5f9",
  },
  dateBadgeAgreed: {
    backgroundColor: "#eff6ff",
  },
  dateBadgeEffective: {
    backgroundColor: "#f0fdf4",
  },
  dateBadgeLabel: {
    fontSize: 7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateBadgeValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  // ─── Equipment table ────────────────────────────────
  table: {
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: BRAND_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tableRowEven: {
    backgroundColor: "#f8fafc",
  },
  colName: { width: "22%" },
  colCategory: { width: "12%" },
  colId: { width: "14%" },
  colAction: { width: "14%" },
  colObs: { width: "22%" },
  colPhotos: { width: "8%" },
  colStatus: { width: "8%", textAlign: "center" },
  cellText: {
    fontSize: 8,
    color: TEXT_PRIMARY,
  },
  cellTextSmall: {
    fontSize: 7,
    color: TEXT_SECONDARY,
  },
  cellMono: {
    fontSize: 7,
    color: TEXT_SECONDARY,
    fontFamily: "Courier",
  },
  actionBadge: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 2,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  checkMark: {
    fontSize: 10,
    color: SUCCESS_COLOR,
    textAlign: "center",
  },
  // ─── Photos section ─────────────────────────────────
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoContainer: {
    width: "31%",
    marginBottom: 8,
  },
  photo: {
    width: "100%",
    height: 100,
    objectFit: "cover",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  photoCaption: {
    fontSize: 7,
    color: TEXT_MUTED,
    marginTop: 2,
    textAlign: "center",
  },
  // ─── Notes ──────────────────────────────────────────
  notesBox: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  notesText: {
    fontSize: 9,
    color: "#92400e",
    lineHeight: 1.4,
  },
  // ─── Signatures ─────────────────────────────────────
  signaturesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 20,
  },
  signatureBlock: {
    flex: 1,
    alignItems: "center",
  },
  signatureImage: {
    width: 180,
    height: 80,
    objectFit: "contain",
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 4,
    backgroundColor: "#ffffff",
  },
  signatureLine: {
    width: 180,
    borderBottomWidth: 1,
    borderBottomColor: TEXT_PRIMARY,
    marginTop: 4,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 8,
    color: TEXT_SECONDARY,
    textAlign: "center",
  },
  signatureName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: TEXT_PRIMARY,
    textAlign: "center",
    marginTop: 2,
  },
  // ─── Footer ─────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: TEXT_MUTED,
  },
  // ─── Empty state ────────────────────────────────────
  emptyText: {
    fontSize: 9,
    color: TEXT_MUTED,
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
});

// ─── Helpers ────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-CL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// ─── Component ──────────────────────────────────────────
export function MaintenanceReport({ data }: { data: ReportData }) {
  const showAllDates =
    data.client.nextMaintenanceBaseAt !== data.client.nextMaintenanceAgreedAt ||
    data.client.nextMaintenanceBaseAt !== data.client.nextMaintenanceAt;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ─── Header ──────────────────────────────── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.companyName}>{data.companyName}</Text>
            <Text style={styles.reportSubtitle}>Reporte de Mantención</Text>
          </View>
          {data.companyLogoUrl && (
            <Image src={data.companyLogoUrl} style={styles.logo} />
          )}
        </View>

        {/* ─── Metadata Grid ───────────────────────── */}
        <View style={styles.metadataGrid}>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>N° Reporte</Text>
            <Text style={styles.metadataValue}>{data.reportNumber}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Fecha</Text>
            <Text style={styles.metadataValue}>
              {formatDate(data.closedAt)}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Técnico</Text>
            <Text style={styles.metadataValue}>{data.technicianName}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Text style={styles.metadataLabel}>Duración</Text>
            <Text style={styles.metadataValue}>{data.duration}</Text>
          </View>
        </View>

        {/* ─── Client Section ──────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <Text style={styles.clientName}>{data.client.name}</Text>

          {data.client.location && (
            <View style={styles.clientField}>
              <Text style={styles.clientLabel}>Ubicación</Text>
              <Text style={styles.clientValue}>{data.client.location}</Text>
            </View>
          )}
          {data.client.contactName && (
            <View style={styles.clientField}>
              <Text style={styles.clientLabel}>Contacto</Text>
              <Text style={styles.clientValue}>{data.client.contactName}</Text>
            </View>
          )}
          {data.client.contactPhone && (
            <View style={styles.clientField}>
              <Text style={styles.clientLabel}>Teléfono</Text>
              <Text style={styles.clientValue}>{data.client.contactPhone}</Text>
            </View>
          )}
          {data.client.contactEmail && (
            <View style={styles.clientField}>
              <Text style={styles.clientLabel}>Email</Text>
              <Text style={styles.clientValue}>{data.client.contactEmail}</Text>
            </View>
          )}

          {/* Next maintenance dates */}
          {data.client.nextMaintenanceAt && (
            <View style={styles.datesRow}>
              {showAllDates && data.client.nextMaintenanceBaseAt && (
                <View style={[styles.dateBadge, styles.dateBadgeBase]}>
                  <Text style={[styles.dateBadgeLabel, { color: TEXT_MUTED }]}>
                    Base
                  </Text>
                  <Text style={[styles.dateBadgeValue, { color: TEXT_PRIMARY }]}>
                    {formatDate(data.client.nextMaintenanceBaseAt)}
                  </Text>
                </View>
              )}
              {showAllDates && data.client.nextMaintenanceAgreedAt && (
                <View style={[styles.dateBadge, styles.dateBadgeAgreed]}>
                  <Text style={[styles.dateBadgeLabel, { color: "#2563eb" }]}>
                    Acordada
                  </Text>
                  <Text style={[styles.dateBadgeValue, { color: "#1d4ed8" }]}>
                    {formatDate(data.client.nextMaintenanceAgreedAt)}
                  </Text>
                </View>
              )}
              <View style={[styles.dateBadge, styles.dateBadgeEffective]}>
                <Text style={[styles.dateBadgeLabel, { color: "#16a34a" }]}>
                  {showAllDates ? "Efectiva" : "Próxima mantención"}
                </Text>
                <Text style={[styles.dateBadgeValue, { color: "#15803d" }]}>
                  {formatDate(data.client.nextMaintenanceAt)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ─── Equipment Table ─────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipos Revisados</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.colName]}>
                Equipo
              </Text>
              <Text style={[styles.tableHeaderText, styles.colCategory]}>
                Categoría
              </Text>
              <Text style={[styles.tableHeaderText, styles.colId]}>
                IP/MAC/Serie
              </Text>
              <Text style={[styles.tableHeaderText, styles.colAction]}>
                Acción
              </Text>
              <Text style={[styles.tableHeaderText, styles.colObs]}>
                Observaciones
              </Text>
              <Text style={[styles.tableHeaderText, styles.colPhotos]}>
                Fotos
              </Text>
              <Text style={[styles.tableHeaderText, styles.colStatus]}>
                ✓
              </Text>
            </View>

            {/* Rows */}
            {data.items.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.tableRow,
                  idx % 2 === 0 ? styles.tableRowEven : {},
                ]}
              >
                <Text style={[styles.cellText, styles.colName]}>
                  {item.equipmentName}
                </Text>
                <Text style={[styles.cellTextSmall, styles.colCategory]}>
                  {item.categoryName || "—"}
                </Text>
                <Text style={[styles.cellMono, styles.colId]}>
                  {item.identifier || "—"}
                </Text>
                <View style={styles.colAction}>
                  {item.actionTypeName ? (
                    <Text
                      style={[
                        styles.actionBadge,
                        {
                          backgroundColor: item.actionTypeColor
                            ? hexToRgb(item.actionTypeColor) + "20"
                            : "#f1f5f9",
                          color: item.actionTypeColor || TEXT_PRIMARY,
                        },
                      ]}
                    >
                      {item.actionTypeName}
                    </Text>
                  ) : (
                    <Text style={styles.cellTextSmall}>—</Text>
                  )}
                </View>
                <Text style={[styles.cellTextSmall, styles.colObs]}>
                  {item.observations
                    ? item.observations.length > 60
                      ? item.observations.substring(0, 60) + "..."
                      : item.observations
                    : "—"}
                </Text>
                <Text style={[styles.cellTextSmall, styles.colPhotos]}>
                  {item.photoCount > 0 ? `${item.photoCount}` : "—"}
                </Text>
                <Text style={[styles.checkMark, styles.colStatus]}>
                  {item.completed ? "✓" : ""}
                </Text>
              </View>
            ))}

            {data.items.length === 0 && (
              <Text style={styles.emptyText}>
                No hay equipos registrados
              </Text>
            )}
          </View>
        </View>

        {/* ─── Photos Section ──────────────────────── */}
        {data.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotografías</Text>
            <View style={styles.photosGrid}>
              {data.photos.map((photo, idx) => (
                <View key={idx} style={styles.photoContainer}>
                  <Image src={photo.data} style={styles.photo} />
                  <Text style={styles.photoCaption}>{photo.caption}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ─── Notes ──────────────────────────────── */}
        {data.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observaciones Generales</Text>
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{data.notes}</Text>
            </View>
          </View>
        )}

        {/* ─── Signatures ─────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Firmas</Text>
          <View style={styles.signaturesContainer}>
            <View style={styles.signatureBlock}>
              {data.technicianSignatureData ? (
                <Image src={data.technicianSignatureData} style={styles.signatureImage} />
              ) : (
                <View
                  style={[
                    styles.signatureImage,
                    { justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <Text style={styles.cellTextSmall}>Sin firma</Text>
                </View>
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Firma del Técnico</Text>
              <Text style={styles.signatureName}>{data.technicianName}</Text>
            </View>
            <View style={styles.signatureBlock}>
              {data.clientSignatureData ? (
                <Image src={data.clientSignatureData} style={styles.signatureImage} />
              ) : (
                <View
                  style={[
                    styles.signatureImage,
                    { justifyContent: "center", alignItems: "center" },
                  ]}
                >
                  <Text style={styles.cellTextSmall}>Sin firma</Text>
                </View>
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>Firma del Cliente</Text>
              <Text style={styles.signatureName}>{data.client.name}</Text>
            </View>
          </View>
        </View>

        {/* ─── Footer ─────────────────────────────── */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.companyName} — Reporte de Mantención
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
          <Text style={styles.footerText}>
            Generado: {formatDate(new Date().toISOString())}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
