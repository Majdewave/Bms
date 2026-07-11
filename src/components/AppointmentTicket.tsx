import type { Appointment } from '@/api/appointmentsService'
import { formatAppointmentTicketDate, formatAppointmentTicketTime } from '@/utils/appointmentTicketPrint'
import { useTranslation } from 'react-i18next'

export type AppointmentTicketBusiness = {
  name: string
  phone?: string | null
}

type Props = {
  appointment: Appointment
  queueNumber: string | number
  business: AppointmentTicketBusiness
}

function TicketField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto,1fr] items-start gap-x-3 text-[10px] leading-tight">
      <span className="font-semibold text-right pe-1 min-w-[9mm]">{label}</span>
      <span className="text-left break-words">{value}</span>
    </div>
  )
}

export default function AppointmentTicket({ appointment, queueNumber, business }: Props) {
  const { t, i18n } = useTranslation()
  const now = new Date()
  const printedAt = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const phone = business.phone?.trim() || '-'

  return (
    <>
      <style>
        {`@media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html, body {
            width: 80mm;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          body * {
            visibility: hidden !important;
          }

          .appointment-ticket-print-root,
          .appointment-ticket-print-root * {
            visibility: visible !important;
          }

          .appointment-ticket-print-root {
            position: fixed;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
          }
        }`}
      </style>

      <div
        className="appointment-ticket-print-root mx-auto bg-white text-black"
        style={{
          width: '68mm',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div
          className="px-[3mm] pt-[1.5mm] pb-[2mm] font-sans text-[10px] leading-tight text-center"
          style={{ paddingBottom: 'calc(2mm + 15px)' }}
        >
          <div className="flex items-center justify-between text-[9px]" dir="ltr">
            <span>{printedAt}</span>
            <span className="font-semibold">Clienta</span>
          </div>

          <div className="my-1.5 border-t border-black" />

          <div className="font-semibold text-[10px] leading-tight px-1 break-words text-center">
            {business.name}
          </div>

          <div className="my-1.5 border-t border-black" />

          <div className="font-bold leading-none text-[30px] py-0.5">
            {queueNumber}
          </div>

          <div className="my-1.5 border-t border-black" />

          <div className="space-y-1 text-right px-[2mm]" dir="rtl">
            <TicketField label={t('appointments.table.client')} value={appointment.clientName || '-'} />
            <TicketField label={t('appointments.table.staff')} value={appointment.staffName || '-'} />
            <TicketField label={t('appointments.form.date')} value={formatAppointmentTicketDate(appointment.startTime, i18n.language)} />
            <TicketField label={t('appointments.form.time')} value={formatAppointmentTicketTime(appointment.startTime, i18n.language)} />
          </div>

          <div className="my-1.5 border-t border-black" />

          <div className="text-center text-[10px]" dir="ltr">☎ {phone}</div>
        </div>
      </div>
    </>
  )
}
