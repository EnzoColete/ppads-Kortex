"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { showErrorToast, showSuccessToast } from "@/lib/toast"

const MIN_PASSWORD_LENGTH = 8

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = fullName.trim()
    const words = trimmedName.split(/\s+/).filter(Boolean)
    if (words.length < 2) {
      showErrorToast("Informe ao menos nome e sobrenome.")
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      showErrorToast(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      showErrorToast("A senha deve conter letras e números.")
      return
    }

    if (password !== confirmPassword) {
      showErrorToast("As senhas não coincidem.")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          email,
          password,
          confirmPassword,
        }),
      })

      const contentType = response.headers.get("content-type") || ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { message: await response.text() }

      if (!response.ok) {
        const message = typeof payload.message === "string" && payload.message.length > 0
          ? payload.message
          : "Erro ao realizar cadastro."
        showErrorToast(message)
        return
      }

      showSuccessToast(payload.message || "Cadastro realizado! Verifique seu e-mail.")
      setFullName("")
      setEmail("")
      setPassword("")
      setConfirmPassword("")

      setTimeout(() => router.push("/auth/login"), 3000)
    } catch (submissionError) {
      console.error(submissionError)
      showErrorToast("Erro inesperado ao realizar cadastro.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-gray-100">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">Crie sua conta</h1>
            <p className="text-sm text-gray-600">Preencha os dados abaixo para iniciar sua experiência.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Cadastro</CardTitle>
              <CardDescription>As informações serão utilizadas para o acesso ao sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Nome completo *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Ex.: Ana Silva"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@exemplo.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="****************"
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">Mínimo de 8 caracteres com letras e números.</p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirmar senha *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="****************"
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Criando conta..." : "Cadastrar"}
                </Button>

                <p className="text-sm text-center text-gray-600">
                  Já possui conta? <Link href="/auth/login" className="text-blue-600 hover:underline">Acesse aqui</Link>.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
