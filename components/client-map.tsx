"use client"

import { useEffect, useRef } from "react"
import type { Client, Alert } from "@/lib/types"

interface ClientMapProps {
  clients: Client[]
  alerts: Alert[]
  selectedClient: Client | null
  onClientSelect: (client: Client) => void
}

export function ClientMap({ clients, alerts, selectedClient, onClientSelect }: ClientMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (!mapRef.current) return

    // Inicializar mapa usando Leaflet (simulado)
    initializeMap()
  }, [])

  useEffect(() => {
    if (mapInstanceRef.current) {
      updateMarkers()
    }
  }, [clients, alerts, selectedClient])

  const initializeMap = () => {
    // Simulação de inicialização do mapa
    // Em um projeto real, você usaria uma biblioteca como Leaflet ou Google Maps

    const mapContainer = mapRef.current!
    mapContainer.innerHTML = `
      <div class="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-blue-100 to-green-100"></div>
        <div id="map-content" class="relative z-10 w-full h-full p-4">
          <div class="text-center mb-4">
            <h3 class="text-lg font-semibold text-gray-700">Mapa Interativo de Clientes</h3>
            <p class="text-sm text-gray-600">Visualização das localizações cadastradas</p>
          </div>
          <div id="markers-container" class="relative w-full h-full">
            <!-- Marcadores serão inseridos aqui -->
          </div>
        </div>
      </div>
    `

    mapInstanceRef.current = mapContainer
    updateMarkers()
  }

  const updateMarkers = () => {
    const markersContainer = mapInstanceRef.current?.querySelector("#markers-container")
    if (!markersContainer) return

    // Limpar marcadores existentes
    markersContainer.innerHTML = ""

    // Adicionar marcadores para cada cliente
    clients.forEach((client, index) => {
      const hasAlerts = alerts.some((alert) => alert.clientId === client.id && !alert.isRead)
      const isSelected = selectedClient?.id === client.id

      // Posição simulada no mapa (distribuição em grid)
      const row = Math.floor(index / 4)
      const col = index % 4
      const top = 20 + row * 25
      const left = 10 + col * 20

      const marker = document.createElement("div")
      marker.className = `absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
        isSelected ? "scale-125 z-20" : "hover:scale-110 z-10"
      }`
      marker.style.top = `${Math.min(top, 80)}%`
      marker.style.left = `${Math.min(left, 90)}%`

      marker.innerHTML = `
        <div class="relative">
          <div class="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold shadow-lg ${
            hasAlerts
              ? "bg-red-500 border-red-600"
              : isSelected
                ? "bg-blue-500 border-blue-600"
                : "bg-green-500 border-green-600"
          }">
            ${hasAlerts ? "!" : index + 1}
          </div>
          ${
            hasAlerts
              ? `
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white"></div>
          `
              : ""
          }
          <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 bg-white px-2 py-1 rounded shadow-md text-xs whitespace-nowrap ${
            isSelected ? "block" : "hidden group-hover:block"
          }">
            ${client.name}
          </div>
        </div>
      `

      marker.addEventListener("click", () => {
        onClientSelect(client)
      })

      markersContainer.appendChild(marker)
    })

    // Adicionar legenda
    const legend = document.createElement("div")
    legend.className = "absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md text-xs"
    legend.innerHTML = `
      <div class="space-y-2">
        <div class="font-semibold">Legenda:</div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-green-500 rounded-full"></div>
          <span>Cliente normal</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-red-500 rounded-full relative">
            <div class="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-600 rounded-full"></div>
          </div>
          <span>Com alertas</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-blue-600"></div>
          <span>Selecionado</span>
        </div>
      </div>
    `

    markersContainer.appendChild(legend)

    // Adicionar informações do mapa
    if (clients.length === 0) {
      const noDataMessage = document.createElement("div")
      noDataMessage.className = "absolute inset-0 flex items-center justify-center"
      noDataMessage.innerHTML = `
        <div class="text-center text-gray-500">
          <div class="text-4xl mb-2">📍</div>
          <p>Nenhum cliente com localização cadastrada</p>
          <p class="text-sm mt-1">Adicione coordenadas aos clientes para visualizá-los no mapa</p>
        </div>
      `
      markersContainer.appendChild(noDataMessage)
    }
  }

  return (
    <div className="w-full h-96 border rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  )
}
