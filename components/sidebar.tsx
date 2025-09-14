"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, Package, Receipt, FileText, Download, CheckSquare, X, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Image from "next/image"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Fornecedores", href: "/suppliers", icon: Users },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Produtos", href: "/products", icon: Package },
  { name: "Recibos", href: "/receipts", icon: Receipt },
  { name: "Gastos Diários", href: "/expenses", icon: CheckSquare },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Exportar", href: "/export", icon: Download },
]

export function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-lg"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {isOpen && (
        <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setIsOpen(false)} />
      )}

      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-6 pt-16 lg:pt-6">
          <div className="flex items-center justify-center">
            <Image
              src="/kortex-logo.png"
              alt="Kortex - Gestão Pessoal Empresarial"
              width={560}
              height={224}
              className="object-contain"
              priority
            />
          </div>
        </div>

        <nav className="mt-6">
          <ul className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}
