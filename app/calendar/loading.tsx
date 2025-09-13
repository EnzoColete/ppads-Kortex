import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
