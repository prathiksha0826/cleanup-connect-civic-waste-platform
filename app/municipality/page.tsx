import { Suspense } from "react";
import { MunicipalityDashboardContent } from "@/components/MunicipalityDashboardContent";

export default function MunicipalityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent shadow-lg"></div>
      </div>
    }>
      <MunicipalityDashboardContent />
    </Suspense>
  );
}