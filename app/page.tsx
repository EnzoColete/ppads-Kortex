import Link from "next/link"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, Receipt, Database } from "lucide-react"
import { PWAInstall } from "@/components/pwa-install"
import { getDashboardStatsForCurrentUser } from "@/lib/server/dashboard-stats"
import { getCurrentUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/login")
  }

  let stats = {
    totalSuppliers: 0,
    totalClients: 0,
    totalProducts: 0,
    monthlyReceipts: 0,
    unreadAlerts: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalServiceOrders: 0,
    dbConnected: true,
  }

  try {
    stats = await getDashboardStatsForCurrentUser()
  } catch (error) {
    console.error("[dashboard] failed to load stats:", error)
    stats.dbConnected = false
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm lg:text-base text-gray-600 mt-2">Visão geral do sistema de gestão empresarial</p>
      </div>

      {!stats.dbConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <Database className="mr-2 h-5 w-5" />
              Configuração do Banco de Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 text-sm">
              O sistema está funcionando em modo offline. Para acessar todas as funcionalidades, configure as variáveis
              de ambiente do Supabase nas configurações do projeto.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Total Fornecedores</CardTitle>
            <Users className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg lg:text-2xl font-bold">{stats.totalSuppliers}</div>
            <p className="text-xs text-muted-foreground hidden lg:block">Fornecedores cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg lg:text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground hidden lg:block">Clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Produtos</CardTitle>
            <Package className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg lg:text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground hidden lg:block">Produtos cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs lg:text-sm font-medium">Recibos Emitidos</CardTitle>
            <Receipt className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg lg:text-2xl font-bold">{stats.monthlyReceipts}</div>
            <p className="text-xs text-muted-foreground hidden lg:block">Este mês</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm lg:text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
            <Link
              href="/clients"
              className="p-3 lg:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500 mb-2" />
              <h3 className="font-medium text-sm lg:text-base">Novo Cliente</h3>
              <p className="text-xs lg:text-sm text-gray-600">Cadastrar novo cliente</p>
            </Link>

            <Link
              href="/receipts"
              className="p-3 lg:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Receipt className="h-5 w-5 lg:h-6 lg:w-6 text-green-500 mb-2" />
              <h3 className="font-medium text-sm lg:text-base">Emitir Recibo</h3>
              <p className="text-xs lg:text-sm text-gray-600">Criar novo recibo</p>
            </Link>

            <Link
              href="/products"
              className="p-3 lg:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Package className="h-5 w-5 lg:h-6 lg:w-6 text-purple-500 mb-2" />
              <h3 className="font-medium text-sm lg:text-base">Novo Produto</h3>
              <p className="text-xs lg:text-sm text-gray-600">Cadastrar produto</p>
            </Link>
          </div>
        </CardContent>
      </Card>

      <PWAInstall />
    </div>
  )
}
