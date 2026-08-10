import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { MapPin, Clock } from 'lucide-react'
 
const ORGANIZATION_MAP: Record<string, string> = {
  municipality: 'شهرداری',
  security: 'نهادهای امنیتی',
  telecom: 'مخابرات',
  water: 'آب و فاضلاب',
  electricity: 'اداره برق',
  gas: 'گاز',
  emergency: 'اورژانس',
  police: 'پلیس',
  fire: 'آتش نشانی',
}
 
const STATUS: Record<string, string> = {
  PENDING: 'در انتظار',
  IN_PROGRESS: 'در حال بررسی',
  RESOLVED: 'حل شده',
}
 
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
}
 
const SEVERITY_COLOR: Record<string, string> = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-yellow-100 text-yellow-800',
  High: 'bg-red-100 text-red-700',
  Critical: 'bg-pink-200 text-pink-800',
}
 
const SEVERITY: Record<string, string> = {
  Low: 'کم', Medium: 'متوسط', High: 'زیاد', Critical: 'بحرانی',
}
 
export default async function OrganizationPage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'ADMIN') redirect('/dashboard')
 
  const { slug } = await params
  const agencyName = ORGANIZATION_MAP[slug]
  if (!agencyName) notFound()
 
  const incidents = await prisma.incident.findMany({
    where: { agencies: { some: { agencyName } } },
    orderBy: { createdAt: 'desc' },
  })
 
  return (
    <DashboardShell user={session}>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">{agencyName}</h1>
        {incidents.length === 0 ? (
          <p className="text-muted-foreground text-sm">حادثه‌ای یافت نشد.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {incidents.map((inc) => (
              <div key={inc.id} className="rounded-xl border bg-white overflow-hidden shadow-sm">
                <div className="relative h-36 bg-gray-100 flex items-center justify-center">
                  {inc.imageUrl ? (
                    <img src={inc.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs text-gray-400">بدون تصویر</span>
                  )}
                  <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[inc.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS[inc.status] ?? inc.status}
                  </span>
                  <span className={`absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full ${SEVERITY_COLOR[inc.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                    {SEVERITY[inc.severity] ?? inc.severity}
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Intl.DateTimeFormat('fa-IR').format(inc.createdAt)}
                    </span>
                    <span className="font-mono">{inc.id.slice(0, 6)}</span>
                  </div>
                  <p className="text-sm font-semibold">{inc.incidentType}</p>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {inc.aiSummary || 'تحلیلی ثبت نشده'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{inc.region || '—'}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2 pt-1 border-t">
                    {inc.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
 
