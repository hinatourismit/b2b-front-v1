import { apiClient } from "@/lib/api-client";

/**
 * Downloads a backend-generated file (PDF voucher/invoice/ticket, Excel sheet)
 * through the authed axios instance and triggers a browser save.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await apiClient.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
