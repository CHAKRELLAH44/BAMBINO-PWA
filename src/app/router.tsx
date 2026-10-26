import { createBrowserRouter, Navigate } from 'react-router'
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { SignUpPage } from '../features/auth/pages/SignUpPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { AppLayout } from './AppLayout'
import { DashboardPage } from './DashboardPage'
import { RouteError } from './RouteError'
import {
  AppointmentFormPage,
  AppointmentsPage,
  BabiesPage,
  BabyFormPage,
  BottleFormPage,
  BreastfeedingFormPage,
  BreastfeedingPage,
  ContainerPage,
  DeleteAccountPage,
  DiaperFormPage,
  GrowthFormPage,
  GrowthPage,
  HistoryPage,
  HydrationPage,
  JournalPage,
  MealsPage,
  MotherContactFormPage,
  MotherPage,
  MotherProfilePage,
  MotherWeightFormPage,
  PersonalEventFormPage,
  PumpingFormPage,
  PumpingPage,
  ReminderFormPage,
  RemindersPage,
  ReportPage,
  SleepFormPage,
  SleepPage,
  StockPage,
  TreatmentsPage,
} from './lazyPages'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignUpPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    // Toutes les routes ci-dessous exigent une utilisatrice connectée
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            // Page impossible à charger (hors ligne avant la mise en cache) : message dans la mise en page
            errorElement: <RouteError />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/journal', element: <JournalPage /> },
              { path: '/history', element: <HistoryPage /> },
              { path: '/babies', element: <BabiesPage /> },
              { path: '/account/profile', element: <MotherProfilePage /> },
              { path: '/account/weight/new', element: <MotherWeightFormPage /> },
              { path: '/account/weight/:weightId', element: <MotherWeightFormPage /> },
              { path: '/account/contacts/new', element: <MotherContactFormPage /> },
              { path: '/account/contacts/:contactId', element: <MotherContactFormPage /> },
              { path: '/account/delete', element: <DeleteAccountPage /> },
              { path: '/babies/new', element: <BabyFormPage /> },
              { path: '/babies/:babyId', element: <BabyFormPage /> },
              { path: '/bottle/new', element: <BottleFormPage /> },
              { path: '/bottle/:eventId', element: <BottleFormPage /> },
              { path: '/breastfeeding', element: <BreastfeedingPage /> },
              { path: '/breastfeeding/new', element: <BreastfeedingFormPage /> },
              { path: '/breastfeeding/:eventId', element: <BreastfeedingFormPage /> },
              { path: '/sleep', element: <SleepPage /> },
              { path: '/sleep/new', element: <SleepFormPage /> },
              { path: '/sleep/:eventId', element: <SleepFormPage /> },
              { path: '/diaper/new', element: <DiaperFormPage /> },
              { path: '/diaper/:eventId', element: <DiaperFormPage /> },
              { path: '/pumping', element: <PumpingPage /> },
              { path: '/pumping/new', element: <PumpingFormPage /> },
              { path: '/pumping/:eventId', element: <PumpingFormPage /> },
              { path: '/growth', element: <GrowthPage /> },
              { path: '/growth/new', element: <GrowthFormPage /> },
              { path: '/growth/:recordId', element: <GrowthFormPage /> },
              { path: '/reports', element: <ReportPage /> },
              { path: '/stock', element: <StockPage /> },
              { path: '/stock/:containerId', element: <ContainerPage /> },
              { path: '/mother', element: <MotherPage /> },
              { path: '/mother/hydration', element: <HydrationPage /> },
              { path: '/mother/meals', element: <MealsPage /> },
              { path: '/mother/medications', element: <TreatmentsPage kind="medication" /> },
              { path: '/mother/supplements', element: <TreatmentsPage kind="supplement" /> },
              { path: '/mother/new/:type', element: <PersonalEventFormPage /> },
              { path: '/mother/events/:eventId', element: <PersonalEventFormPage /> },
              { path: '/appointments', element: <AppointmentsPage /> },
              { path: '/appointments/new', element: <AppointmentFormPage /> },
              { path: '/appointments/:appointmentId', element: <AppointmentFormPage /> },
              { path: '/reminders', element: <RemindersPage /> },
              { path: '/reminders/new', element: <ReminderFormPage /> },
              { path: '/reminders/:reminderId', element: <ReminderFormPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
