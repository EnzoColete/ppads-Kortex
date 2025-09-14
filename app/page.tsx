"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Package, Receipt, AlertTriangle, Database } from "lucide-react"
import { getDashboardStats } from "@/lib/storage"
import { PWAInstall } from "@/components/pwa-install"

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalSuppliers: 0,
    totalClients: 0,
    totalProducts: 0,
    monthlyReceipts: 0,
    unreadAlerts: 0,
  })
  const [loading, setLoading] = useState(true)
  const [dbConnected, setDbConnected] = useState(true)

  const updateStats = async () => {
    try {
      console.log("[v0] Updating dashboard stats")
      const newStats = await getDashboardStats()
      console.log("[v0] Stats received:", newStats)
      setStats(newStats)
      setDbConnected(true)
    } catch (error) {
      console.error("[v0] Erro ao carregar estatísticas:", error)
      setDbConnected(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    updateStats()

    const interval = setInterval(updateStats, 30000) // Atualiza a cada 30 segundos

    return () => {
      clearInterval(interval)
    }
  }, [])

  const handleNewClient = () => {
    router.push("/clients")
  }

  const handleNewReceipt = () => {
    router.push("/receipts")
  }

  const handleNewProduct = () => {
    router.push("/products")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm lg:text-base text-gray-600 mt-2">Visão geral do sistema de gestão empresarial</p>
      </div>

      {!dbConnected && (
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

      {/* Alertas recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm lg:text-base">
            <AlertTriangle className="mr-2 h-4 w-4 lg:h-5 lg:w-5 text-yellow-500" />
            Alertas Recentes
            {stats.unreadAlerts > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">{stats.unreadAlerts}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 lg:py-8 text-gray-500 text-sm lg:text-base">
            {stats.unreadAlerts === 0
              ? "Nenhum alerta pendente no momento"
              : `${stats.unreadAlerts} alerta(s) pendente(s) - Verifique a seção de Alertas`}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm lg:text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
            <button
              onClick={handleNewClient}
              className="p-3 lg:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Users className="h-5 w-5 lg:h-6 lg:w-6 text-blue-500 mb-2" />
              <h3 className="font-medium text-sm lg:text-base">Novo Cliente</h3>
              <p className="text-xs lg:text-sm text-gray-600">Cadastrar novo cliente</p>
            </button>

            <button
              onClick={handleNewReceipt}
              className="p-3 lg:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Receipt className="h-5 w-5 lg:h-6 lg:w-6 text-green-500 mb-2" />
              <h3 className="font-medium text-sm lg:text-base">Emitir Recibo</h3>
              <p className="text-xs lg:text-sm text-gray-600">Criar novo recibo</p>
            </button>

            <button
              onClick={handleNewProduct}
              className="p-3 lg:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
            >
              <Package className="h-5 w-5 lg:h-6 lg:w-6 text-purple-500 mb-2" />
              <h3 className="font-medium text-sm lg:text-base">Novo Produto</h3>
              <p className="text-xs lg:text-sm text-gray-600">Cadastrar produto</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <PWAInstall />
    </div>
  )
}
