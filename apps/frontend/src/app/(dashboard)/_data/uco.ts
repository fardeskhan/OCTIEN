import { CollectionSource, Collection, Route, RouteStop, RouteException, QualityInspection, Barrel } from "@/types"
import { Customer } from "@/types/sales"

export const mockSources: CollectionSource[] = [
  { id: "SRC-101", name: "Burger King - Main St", type: "Restaurant", zone: "North", volumeKg: 420, qualityGrade: "A", growthTrend: 8, missedPickupPct: 1, frequency: "Weekly", revenue: 850 },
  { id: "SRC-102", name: "Taj Hotel Kitchen", type: "Hotel", zone: "South", volumeKg: 1200, qualityGrade: "A", growthTrend: 2, missedPickupPct: 0, frequency: "Bi-Weekly", revenue: 2400 },
  { id: "SRC-103", name: "Spicy Treats Cloud", type: "Cloud Kitchen", zone: "East", volumeKg: 150, qualityGrade: "C", growthTrend: -5, missedPickupPct: 12, frequency: "Weekly", revenue: 200 },
]

export const mockCollections: Collection[] = [
  { id: "SCH-001", source: "Burger King - Main St", route: "North-01", expectedVolume: 45, date: "2026-07-07", status: "Scheduled" },
  { id: "SCH-002", source: "Taj Hotel Kitchen", route: "South-03", expectedVolume: 120, date: "2026-07-08", status: "Scheduled" },
]

export const mockCompletedCollections: Collection[] = [
  { id: "COL-101", source: "Burger King - Main St", route: "North-01", date: "2026-07-05", expectedVolume: 45, actualVolume: 42, driver: "John Doe", status: "Completed" },
  { id: "COL-102", source: "Spicy Treats Cloud", route: "East-02", date: "2026-07-05", expectedVolume: 20, actualVolume: 25, driver: "Sarah Lee", status: "Completed" },
]

export const mockMissedCollections: Collection[] = [
  { id: "EXC-001", source: "Downtown Diner", route: "North-01", date: "2026-07-06", expectedVolume: 30, reason: "Location Closed", driver: "John Doe", status: "Missed" },
  { id: "EXC-002", source: "Burger King - West", route: "South-03", date: "2026-07-06", expectedVolume: 50, reason: "Vehicle Breakdown", driver: "Mike Smith", status: "Missed" },
]

export const mockPendingCollections: Collection[] = [
  { id: "COL-201", source: "Burger King - Main St", route: "North-01", date: "2026-07-06", expectedVolume: 45, status: "Pending" },
  { id: "COL-202", source: "Taj Hotel Kitchen", route: "South-03", date: "2026-07-06", expectedVolume: 120, status: "Pending" },
]

export const mockRoutes: Route[] = [
  { id: "RT-01", name: "North-01", driver: "John Doe", stops: 14, collectedKg: 560, efficiency: 92, status: "Healthy" },
  { id: "RT-02", name: "South-03", driver: "Mike Smith", stops: 8, collectedKg: 210, efficiency: 65, status: "Delayed" },
  { id: "RT-03", name: "East-02", driver: "Sarah Lee", stops: 2, collectedKg: 45, efficiency: 30, status: "Critical" },
]

export const mockStops: RouteStop[] = [
  { id: "STP-01", route: "North-01", source: "Burger King - Main St", sequence: 1, eta: "10:00 AM", status: "Completed" },
  { id: "STP-02", route: "North-01", source: "Downtown Diner", sequence: 2, eta: "11:30 AM", status: "Skipped" },
  { id: "STP-03", route: "North-01", source: "Spicy Treats Cloud", sequence: 3, eta: "01:00 PM", status: "Pending" },
]

export const mockExceptions: RouteException[] = [
  { id: "EXC-112", route: "South-03", driver: "Mike Smith", exceptionType: "Traffic Delay (>45m)", timeLogged: "10:15 AM", status: "Open" },
  { id: "EXC-111", route: "East-02", driver: "Sarah Lee", exceptionType: "Vehicle Breakdown", timeLogged: "08:30 AM", status: "Resolved" },
]

export const mockQualityTests: QualityInspection[] = [
  { id: "QA-01", source: "Burger King - Main St", batchVolume: 45, grade: "A", ffaPct: 3.2, moisturePct: 1.1, status: "Accepted" },
  { id: "QA-02", source: "Spicy Treats Cloud", batchVolume: 20, grade: "Reject", ffaPct: 18.5, moisturePct: 5.4, status: "Rejected" },
  { id: "QA-03", source: "Taj Hotel Kitchen", batchVolume: 120, grade: "B", ffaPct: 6.8, moisturePct: 2.0, status: "Pending Inspection" },
]

export const mockUcoCustomers: Customer[] = [
  { id: "CUST-B01", name: "EcoDiesel Corp", industry: "Biodiesel", volumePurchased: 15000, avgPricePerKg: 0.85, revenue: 12750, marginPct: 42 },
  { id: "CUST-S01", name: "Suds & Soap Co", industry: "Soap Mfg", volumePurchased: 8500, avgPricePerKg: 0.92, revenue: 7820, marginPct: 48 },
  { id: "CUST-I01", name: "Industrial Lubes", industry: "Industrial", volumePurchased: 2000, avgPricePerKg: 0.65, revenue: 1300, marginPct: 22 },
]

export const mockBarrels: Barrel[] = Array.from({ length: 1050 }).map((_, i) => {
  const isLost = i % 100 === 99;
  const isMaintenance = i % 80 === 79;
  const isTransit = i % 10 === 0;
  const isProcessing = i % 25 === 0;
  
  let status: Barrel["status"] = "Deployed";
  if (isLost) status = "Lost";
  else if (isMaintenance) status = "Maintenance";
  else if (isTransit) status = "In Transit";
  else if (isProcessing) status = "Processing";

  return {
    id: `BRL-${(10000 + i).toString()}`,
    capacity: 120,
    location: status === "Deployed" ? `Source Location ${i % 50}` : status === "In Transit" ? `Vehicle ${i % 12}` : "Depot",
    lastCollectionDays: (i % 45) + 1,
    status
  }
})
