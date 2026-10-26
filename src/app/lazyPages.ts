import { lazy } from 'react'

// Chargement à la demande : seules la connexion, l'inscription et l'accueil sont dans le fichier de départ.
// Les autres pages arrivent quand on les ouvre (le service worker les garde ensuite en cache).
export const AppointmentFormPage = lazy(() =>
  import('../features/appointments/AppointmentFormPage').then((m) => ({ default: m.AppointmentFormPage })),
)
export const AppointmentsPage = lazy(() =>
  import('../features/appointments/AppointmentsPage').then((m) => ({ default: m.AppointmentsPage })),
)
export const TreatmentsPage = lazy(() =>
  import('../features/medications/TreatmentsPage').then((m) => ({ default: m.TreatmentsPage })),
)
export const HydrationPage = lazy(() =>
  import('../features/mother-services/HydrationPage').then((m) => ({ default: m.HydrationPage })),
)
export const MealsPage = lazy(() => import('../features/mother-services/MealsPage').then((m) => ({ default: m.MealsPage })))
export const MotherPage = lazy(() => import('../features/mother-services/MotherPage').then((m) => ({ default: m.MotherPage })))
export const PersonalEventFormPage = lazy(() =>
  import('../features/mother-services/PersonalEventFormPage').then((m) => ({ default: m.PersonalEventFormPage })),
)
export const ReminderFormPage = lazy(() =>
  import('../features/reminders/pages/ReminderFormPage').then((m) => ({ default: m.ReminderFormPage })),
)
export const RemindersPage = lazy(() =>
  import('../features/reminders/pages/RemindersPage').then((m) => ({ default: m.RemindersPage })),
)
export const DeleteAccountPage = lazy(() =>
  import('../features/auth/pages/DeleteAccountPage').then((m) => ({ default: m.DeleteAccountPage })),
)
export const MotherProfilePage = lazy(() =>
  import('../features/mother-profile/pages/MotherProfilePage').then((m) => ({ default: m.MotherProfilePage })),
)
export const MotherWeightFormPage = lazy(() =>
  import('../features/mother-profile/pages/MotherWeightFormPage').then((m) => ({ default: m.MotherWeightFormPage })),
)
export const MotherContactFormPage = lazy(() =>
  import('../features/mother-profile/pages/MotherContactFormPage').then((m) => ({ default: m.MotherContactFormPage })),
)
export const BabiesPage = lazy(() => import('../features/babies/pages/BabiesPage').then((m) => ({ default: m.BabiesPage })))
export const BabyFormPage = lazy(() =>
  import('../features/babies/pages/BabyFormPage').then((m) => ({ default: m.BabyFormPage })),
)
export const BottleFormPage = lazy(() =>
  import('../features/bottle/pages/BottleFormPage').then((m) => ({ default: m.BottleFormPage })),
)
export const BreastfeedingFormPage = lazy(() =>
  import('../features/breastfeeding/pages/BreastfeedingFormPage').then((m) => ({ default: m.BreastfeedingFormPage })),
)
export const BreastfeedingPage = lazy(() =>
  import('../features/breastfeeding/pages/BreastfeedingPage').then((m) => ({ default: m.BreastfeedingPage })),
)
export const JournalPage = lazy(() => import('../features/daily-journal/JournalPage').then((m) => ({ default: m.JournalPage })))
export const DiaperFormPage = lazy(() =>
  import('../features/diaper/pages/DiaperFormPage').then((m) => ({ default: m.DiaperFormPage })),
)
export const GrowthFormPage = lazy(() =>
  import('../features/growth/pages/GrowthFormPage').then((m) => ({ default: m.GrowthFormPage })),
)
export const GrowthPage = lazy(() => import('../features/growth/pages/GrowthPage').then((m) => ({ default: m.GrowthPage })))
export const HistoryPage = lazy(() => import('../features/history/HistoryPage').then((m) => ({ default: m.HistoryPage })))
export const ContainerPage = lazy(() =>
  import('../features/milk-stock/pages/ContainerPage').then((m) => ({ default: m.ContainerPage })),
)
export const PumpingFormPage = lazy(() =>
  import('../features/milk-stock/pages/PumpingFormPage').then((m) => ({ default: m.PumpingFormPage })),
)
export const PumpingPage = lazy(() =>
  import('../features/milk-stock/pages/PumpingPage').then((m) => ({ default: m.PumpingPage })),
)
export const StockPage = lazy(() => import('../features/milk-stock/pages/StockPage').then((m) => ({ default: m.StockPage })))
export const ReportPage = lazy(() => import('../features/reports/pages/ReportPage').then((m) => ({ default: m.ReportPage })))
export const SleepFormPage = lazy(() =>
  import('../features/sleep/pages/SleepFormPage').then((m) => ({ default: m.SleepFormPage })),
)
export const SleepPage = lazy(() => import('../features/sleep/pages/SleepPage').then((m) => ({ default: m.SleepPage })))
