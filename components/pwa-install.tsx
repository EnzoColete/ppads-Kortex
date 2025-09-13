"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download, X, Smartphone } from "lucide-react"

export function PWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    const isInWebAppiOS = (window.navigator as any).standalone === true

    if (isStandalone || isInWebAppiOS) {
      setIsInstalled(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstall(true)
    }

    window.addEventListener("beforeinstallprompt", handler)

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("SW registered: ", registration)

          // Verifica atualizações
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // Nova versão disponível
                  console.log("Nova versão disponível")
                }
              })
            }
          })
        })
        .catch((registrationError) => {
          console.log("SW registration failed: ", registrationError)
        })
    }

    const detectiOSInstall = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isInStandaloneMode = (window.navigator as any).standalone

      if (isIOS && !isInStandaloneMode && !localStorage.getItem("iosInstallPromptShown")) {
        setShowInstall(true)
        localStorage.setItem("iosInstallPromptShown", "true")
      }
    }

    detectiOSInstall()

    return () => {
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        alert('Para instalar no iOS: Toque no ícone de compartilhar e selecione "Adicionar à Tela de Início"')
        setShowInstall(false)
        return
      }
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      setDeferredPrompt(null)
      setShowInstall(false)
      setIsInstalled(true)
    }
  }

  const handleDismiss = () => {
    setShowInstall(false)
    setDeferredPrompt(null)
  }

  if (isInstalled || !showInstall) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-sm">Instalar App</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-sm text-gray-600 mb-3">
        Instale o Sistema de Gestão no seu dispositivo para acesso rápido e sincronização automática.
      </p>
      <div className="flex gap-2">
        <Button onClick={handleInstall} size="sm" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Instalar
        </Button>
        <Button variant="outline" onClick={handleDismiss} size="sm">
          Depois
        </Button>
      </div>
    </div>
  )
}
