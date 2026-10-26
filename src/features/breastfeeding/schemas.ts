import { z } from 'zod'
import type { SessionSegment } from '../../types/event'
import { parseInputValue } from '../../utils/dateInput'
import { commentField, optionalIntField, pastDateTimeField } from '../../utils/formFields'
import { validateSegments } from './session'

const segmentSchema = z.object({
  side: z.enum(['left', 'right']),
  startAt: pastDateTimeField(),
  endAt: pastDateTimeField(),
})

// Les messages sont des clés de traduction (src/i18n/locales/fr.ts)
export const feedingFormSchema = z
  .object({
    segments: z.array(segmentSchema),
    estimatedLeftMl: optionalIntField(500, 'feeding.validation.estimate'),
    estimatedRightMl: optionalIntField(500, 'feeding.validation.estimate'),
    comment: commentField(),
  })
  .superRefine((values, context) => {
    const error = validateSegments(toSegments(values.segments))
    if (error) context.addIssue({ code: 'custom', path: ['segments'], message: `feeding.validation.${error}` })
  })

export type FeedingFormValues = z.infer<typeof feedingFormSchema>

export const toSegments = (segments: FeedingFormValues['segments']): SessionSegment[] =>
  segments.map((segment) => ({
    side: segment.side,
    startAt: parseInputValue(segment.startAt) ?? new Date(NaN),
    endAt: parseInputValue(segment.endAt),
  }))
