import { DashboardService } from "@/lib/dashboard/dashboard-service"

export async function getGroupDashboardData(tenantId: string) {
  // Real data
  const scorecard = await DashboardService.getBusinessScorecard(tenantId)
  
  // Fake historical cash flow data for chart
  const cashFlowData = Array.from({ length: 30 }).map((_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cash: 5000000 + Math.random() * 2000000 - 1000000 + (i * 50000)
  }))

  return {
    scorecard,
    cashFlowData
  }
}

export async function getSalamColaDashboardData(businessId: string) {
  // Real Data
  const dashboard = await DashboardService.getExecutiveDashboard(businessId)

  // Mocked placeholders for Salam Cola
  const territoryCoverage = [
    { name: "North Region", value: 85, colorClass: "text-info" },
    { name: "South Region", value: 92, colorClass: "text-success" },
    { name: "East Region", value: 64, colorClass: "text-warning" },
    { name: "West Region", value: 45, colorClass: "text-destructive" },
  ]
  const campaigns = [
    { name: "Summer Cola Blast", roi: 215, spend: 120000 },
    { name: "B2B Bulk Discount", roi: 340, spend: 45000 },
  ]
  const topDistributors = [
    { name: "National Foods Ltd", revenue: 1250000 },
    { name: "Metro Cash & Carry", revenue: 980000 },
    { name: "Regional Supply Co", revenue: 450000 },
  ]
  const revenueChart = Array.from({ length: 12 }).map((_, i) => ({
    month: new Date(2026, i, 1).toLocaleDateString('en-US', { month: 'short' }),
    actual: 800000 + Math.random() * 400000,
    target: 1000000 + (i * 50000)
  }))

  return {
    dashboard,
    territoryCoverage,
    campaigns,
    topDistributors,
    revenueChart
  }
}

export async function getUCODashboardData(businessId: string) {
  // Real Data
  const dashboard = await DashboardService.getExecutiveDashboard(businessId)

  // Mocked placeholders for UCO
  const collectedKg = 1250000
  const costPerKg = 42.50
  const collectionCost = 53125000
  const margin = 28.4
  const pendingCollections = 14500 // KG

  const collectionTrend = Array.from({ length: 14 }).map((_, i) => ({
    day: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { weekday: 'short' }),
    kg: 80000 + Math.random() * 20000,
    target: 90000
  }))

  const topSources = [
    { name: "McDonalds Corp (North)", kg: 145000 },
    { name: "KFC Regional", kg: 98000 },
    { name: "Local Restaurant Group", kg: 45000 },
  ]

  const topCustomers = [
    { name: "Global Biofuels Ltd", revenue: 4500000 },
    { name: "EcoDiesel Corp", revenue: 2800000 },
  ]

  return {
    dashboard,
    collectedKg,
    costPerKg,
    collectionCost,
    margin,
    pendingCollections,
    collectionTrend,
    topSources,
    topCustomers
  }
}
