import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/lib/api";

export const usePdfStore = defineStore("pdf", () => {
  const generating = ref<Set<string>>(new Set());

  function isGenerating(maintenanceId: string): boolean {
    return generating.value.has(maintenanceId);
  }

  /**
   * Download PDF for a maintenance. Opens in a new tab or triggers download.
   */
  async function downloadPdf(maintenanceId: string): Promise<void> {
    try {
      const response = await api.get(`/maintenances/${maintenanceId}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `mantencion-${maintenanceId.substring(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      if (err.response?.status === 404) {
        throw new Error("PDF no generado. Usá 'Generar PDF' primero.");
      }
      throw new Error(err.response?.data?.error || "Error al descargar PDF");
    }
  }

  /**
   * Generate (or regenerate) PDF for a maintenance.
   */
  async function generatePdf(
    maintenanceId: string
  ): Promise<string | null> {
    generating.value.add(maintenanceId);

    try {
      const { data } = await api.post<{
        pdfPath: string;
        pdfEngine: string;
      }>(`/maintenances/${maintenanceId}/pdf/regenerate`);

      return data.pdfPath;
    } catch (err: any) {
      throw new Error(
        err.response?.data?.error || "Error al generar PDF"
      );
    } finally {
      generating.value.delete(maintenanceId);
    }
  }

  /**
   * Generate and then download.
   */
  async function generateAndDownload(maintenanceId: string): Promise<void> {
    await generatePdf(maintenanceId);
    await downloadPdf(maintenanceId);
  }

  return {
    generating,
    isGenerating,
    downloadPdf,
    generatePdf,
    generateAndDownload,
  };
});
