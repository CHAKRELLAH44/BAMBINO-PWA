import { zodResolver } from '@hookform/resolvers/zod'
import { IconCamera } from '@tabler/icons-react'
import { useState, type ChangeEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { FormField } from '../../../components/FormField'
import { PageHeader } from '../../../components/PageHeader'
import {
  dangerButton,
  errorText,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
} from '../../../components/styles'
import {
  createBaby,
  deleteBaby,
  setBabyArchived,
  updateBaby,
} from '../../../services/repositories/babyRepository'
import { BABY_THEME_COLORS, type Baby, type BabyInput } from '../../../types/baby'
import { parseInputValue, toDateInputValue } from '../../../utils/dateInput'
import { photoToDataUrl } from '../../../utils/photo'
import { useUserId } from '../../auth/useAuth'
import { BABY_AVATARS, DEFAULT_BABY_AVATAR, THEME_SWATCH_CLASSES } from '../babyOptions'
import { BabyAvatar } from '../BabyAvatar'
import { babySchema, type BabyFormValues } from '../schemas'
import { useActiveBaby } from '../useActiveBaby'
import { saveErrorKey } from '../../../utils/firebaseErrors'

/** Création (/babies/new) ou modification (/babies/:babyId) d'un profil bébé (§4) */
export function BabyFormPage() {
  const { t } = useTranslation()
  const { babyId } = useParams()
  const { babies, loading } = useActiveBaby()

  if (!babyId) return <BabyForm />
  if (loading) return <p className="text-slate-500">{t('common.loading')}</p>

  const baby = babies.find((candidate) => candidate.id === babyId)
  if (!baby) return <p className="text-slate-600">{t('babies.notFound')}</p>

  return <BabyForm key={baby.id} baby={baby} />
}

const toFormValues = (baby?: Baby): BabyFormValues =>
  baby
    ? {
        name: baby.name,
        birthDate: toDateInputValue(baby.birthDate.toDate()),
        sex: baby.sex ?? 'unspecified',
        avatarEmoji: baby.avatarEmoji,
        themeColor: baby.themeColor ?? 'none',
        photo: baby.photo ?? '',
      }
    : {
        name: '',
        birthDate: '',
        sex: 'unspecified',
        avatarEmoji: DEFAULT_BABY_AVATAR,
        themeColor: 'none',
        photo: '',
      }

function BabyForm({ baby }: { baby?: Baby }) {
  const { t } = useTranslation()
  const userId = useUserId()
  const navigate = useNavigate()
  const { setActiveBabyId } = useActiveBaby()
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [today] = useState(() => toDateInputValue(new Date()))
  const [photoError, setPhotoError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BabyFormValues>({ resolver: zodResolver(babySchema), defaultValues: toFormValues(baby) })
  const [avatarEmoji, themeColor, photo] = useWatch({ control, name: ['avatarEmoji', 'themeColor', 'photo'] })

  // Photo choisie sur le téléphone : réduite et compressée avant d'être gardée dans le profil
  const onPhotoChosen = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setPhotoError(null)
    try {
      setValue('photo', await photoToDataUrl(file), { shouldDirty: true })
    } catch {
      setPhotoError('babies.photoError')
    }
  }

  const fieldError = (message?: string) => (message ? t(message) : undefined)

  const onSubmit = async (values: BabyFormValues) => {
    setActionError(null)
    const input: BabyInput = {
      name: values.name,
      birthDate: parseInputValue(values.birthDate)!,
      sex: values.sex === 'unspecified' ? null : values.sex,
      avatarEmoji: values.avatarEmoji,
      themeColor: values.themeColor === 'none' ? null : values.themeColor,
      photo: values.photo || null,
    }
    try {
      if (baby) {
        await updateBaby(userId, baby.id, input)
        await navigate('/babies', { replace: true })
      } else {
        setActiveBabyId(await createBaby(userId, input))
        await navigate('/', { replace: true })
      }
    } catch (error) {
      setActionError(saveErrorKey(error))
    }
  }

  const runAction = async (action: () => Promise<void>) => {
    setActionError(null)
    setBusy(true)
    try {
      await action()
      await navigate('/babies', { replace: true })
    } catch (error) {
      setActionError(saveErrorKey(error))
      setBusy(false)
    }
  }

  const toggleArchived = () => runAction(() => setBabyArchived(userId, baby!.id, !baby!.archivedAt))

  const remove = () => {
    if (!window.confirm(t('babies.deleteConfirm', { name: baby!.name }))) return
    void runAction(() => deleteBaby(userId, baby!.id))
  }

  return (
    <>
      <PageHeader title={t(baby ? 'babies.editTitle' : 'babies.newTitle')} backTo="/babies" />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <FormField
          id="name"
          label={t('babies.fields.name')}
          autoComplete="off"
          error={fieldError(errors.name?.message)}
          {...register('name')}
        />
        <FormField
          id="birthDate"
          type="date"
          label={t('babies.fields.birthDate')}
          max={today}
          error={fieldError(errors.birthDate?.message)}
          {...register('birthDate')}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="sex" className={labelClass}>
            {t('babies.fields.sex')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </label>
          <select id="sex" className={inputClass} {...register('sex')}>
            <option value="unspecified">{t('babies.sex.unspecified')}</option>
            <option value="female">{t('babies.sex.female')}</option>
            <option value="male">{t('babies.sex.male')}</option>
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>
            {t('babies.fields.photo')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </legend>
          <div className="flex items-center gap-4">
            <BabyAvatar
              baby={{ avatarEmoji, themeColor: themeColor === 'none' ? null : themeColor, photo: photo || null }}
              size="lg"
            />
            <div className="flex flex-col gap-2">
              <label className={`${secondaryButton} cursor-pointer text-sm`}>
                <input type="file" accept="image/*" className="sr-only" onChange={(event) => void onPhotoChosen(event)} />
                <span className="inline-flex items-center gap-2">
                  <IconCamera aria-hidden="true" size={18} stroke={1.75} />
                  {t(photo ? 'babies.changePhoto' : 'babies.addPhoto')}
                </span>
              </label>
              {photo && (
                <button type="button" onClick={() => setValue('photo', '', { shouldDirty: true })} className={`${dangerButton} text-sm`}>
                  {t('babies.removePhoto')}
                </button>
              )}
            </div>
          </div>
          <input type="hidden" {...register('photo')} />
          <p className="text-xs text-slate-500">{t('babies.photoHint')}</p>
          {photoError && <p className={errorText}>{t(photoError)}</p>}
          {errors.photo?.message && <p className={errorText}>{t(errors.photo.message)}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>{t('babies.fields.avatar')}</legend>
          <div className="grid grid-cols-8 gap-1.5">
            {BABY_AVATARS.map(({ key, icon: AvatarIcon }) => (
              <label key={key} className="relative cursor-pointer" title={key}>
                <input type="radio" value={key} className="peer sr-only" {...register('avatarEmoji')} />
                <span className="flex aspect-square items-center justify-center rounded-xl bg-surface text-slate-600 ring-1 ring-slate-200 peer-checked:bg-rose-100 peer-checked:text-rose-600 peer-checked:ring-2 peer-checked:ring-rose-400 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-300">
                  <AvatarIcon aria-hidden="true" size={24} stroke={1.75} />
                </span>
              </label>
            ))}
          </div>
          {photo && <p className="text-xs text-slate-500">{t('babies.avatarWithPhoto')}</p>}
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className={labelClass}>
            {t('babies.fields.themeColor')} <span className="font-normal text-slate-400">({t('common.optional')})</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {(['none', ...BABY_THEME_COLORS] as const).map((color) => (
              <label key={color} className="relative cursor-pointer" title={t(`babies.colors.${color}`)}>
                <input type="radio" value={color} className="peer sr-only" {...register('themeColor')} />
                <span className="sr-only">{t(`babies.colors.${color}`)}</span>
                <span
                  aria-hidden="true"
                  className={`block h-9 w-9 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-rose-500 peer-focus-visible:ring-2 peer-focus-visible:ring-rose-300 ${
                    color === 'none' ? 'border-2 border-dashed border-slate-300 bg-surface' : THEME_SWATCH_CLASSES[color]
                  }`}
                />
              </label>
            ))}
          </div>
        </fieldset>

        {actionError && (
          <p role="alert" className={errorText}>
            {t(actionError)}
          </p>
        )}

        <button type="submit" disabled={isSubmitting || busy} className={primaryButton}>
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </form>

      {baby && (
        <div className="mt-6 flex flex-col gap-2 border-t border-rose-100 pt-6">
          <button type="button" onClick={() => void toggleArchived()} disabled={busy} className={secondaryButton}>
            {t(baby.archivedAt ? 'babies.unarchive' : 'babies.archive')}
          </button>
          <button type="button" onClick={remove} disabled={busy} className={dangerButton}>
            {t('common.delete')}
          </button>
        </div>
      )}
    </>
  )
}
