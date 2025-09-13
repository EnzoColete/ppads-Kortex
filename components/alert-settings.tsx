"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { X, RefreshCw, Save } from "lucide-react"

interface AlertSettingsProps {
  onClose: () => void
  onRefresh: () => void
}

export function AlertSettings({ onClose, onRefresh }: AlertSettingsProps) {
  const [settings, setSettings] = useState({
    enabled30days: true,
    enabled40days: true,
    enabled50days: true,
    enabled60days: true,
    autoGenerate: true,
    checkInterval: "daily",
  })

  const handleSave = () => {
    // Salvar configurações no localStorage
    localStorage.setItem("alertSettings", JSON.stringify(settings))
    alert("Configurações salvas com sucesso!")
    onClose()
  }

  const handleRefreshAlerts = () => {
    onRefresh()
    alert("Alertas atualizados com sucesso!")
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Configurações de Alertas</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipos de alerta */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Tipos de Alerta Ativados</Label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="alert30">Alertas de 30 dias</Label>
                <Switch
                  id="alert30"
                  checked={settings.enabled30days}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled30days: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="alert40">Alertas de 40 dias</Label>
                <Switch
                  id="alert40"
                  checked={settings.enabled40days}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled40days: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="alert50">Alertas de 50 dias</Label>
                <Switch
                  id="alert50"
                  checked={settings.enabled50days}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled50days: checked }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="alert60">Alertas de 60 dias</Label>
                <Switch
                  id="alert60"
                  checked={settings.enabled60days}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, enabled60days: checked }))}
                />
              </div>
            </div>
          </div>

          {/* Configurações gerais */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Configurações Gerais</Label>

            <div className="flex items-center justify-between">
              <Label htmlFor="autoGenerate">Geração Automática</Label>
              <Switch
                id="autoGenerate"
                checked={settings.autoGenerate}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoGenerate: checked }))}
              />
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-3">
            <Button onClick={handleRefreshAlerts} variant="outline" className="w-full bg-transparent">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Alertas Agora
            </Button>

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>

          {/* Informações */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Os alertas são gerados automaticamente baseados na data do último recibo de cada cliente</p>
            <p>• Clientes sem recibos não geram alertas</p>
            <p>• Alertas duplicados não são criados</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
