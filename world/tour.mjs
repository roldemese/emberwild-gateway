/** A first visit along the plain path. Text and a camera. Skip any time. Leaf stays at 0. */

export const TOUR_KEY = 'emberwild-tour'

export const TOUR = Object.freeze([
  {
    place: 'keep',
    title: 'Hearth',
    text: 'You are at the hearth. You may look, and you may leave. The Leaf stays at 0.',
    eye: [1.6, 2.8, 15.2],
    look: [0, 1.2, -1],
  },
  {
    place: 'town-hall',
    title: 'Town hall',
    text: 'The hall is for a sitting. A reading here is not a proclamation. The Leaf stays at 0.',
    eye: [0.3, 1.75, 7.2],
    look: [0, 1.5, -4],
  },
  {
    place: 'refuge-bridge',
    title: 'Refuge bridge',
    text: 'Three arches. The bridge is paper. No coin crosses. The Leaf stays at 0.',
    eye: [-12, 3.2, 7],
    look: [2, 1.5, 0],
  },
  {
    place: 'gate-tower',
    title: 'Gate tower',
    text: 'The tower room is open. The lamp in the window is Jimmy\'s. The Leaf stays at 0.',
    eye: [8.6, 1.55, 3.2],
    look: [5.4, 1.9, 0.4],
  },
  {
    place: 'estate-grove',
    title: 'Estate grove',
    text: 'A warm post is a held seat. A cold post is open. The Leaf stays at 0.',
    eye: [0.4, 7.2, 16],
    look: [0, 1.1, -2],
  },
])

export function shouldOfferTour(saved) {
  return saved !== 'skipped' && saved !== 'done'
}
