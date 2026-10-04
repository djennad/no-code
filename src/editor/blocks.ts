// Ready-made sections that can be dropped onto a page in one go.

import type { NodeData, Variable } from '../runtime/types'
import { uid } from './id'
import { createNode as c } from './registry'

export interface Block {
  id: string
  label: string
  description: string
  create: () => NodeData
  /** Variables the block relies on; added to the project when missing. */
  variables?: () => Variable[]
}

const MUTED = '#4b5563'

export function img(seed: string, w = 1200, h = 800) {
  return `https://picsum.photos/seed/${seed}/${w}/${h}`
}

export const navbar = (brand = 'Acme', links: NodeData[] = [], cta = 'Get started') =>
  c('section', {}, { padding: '16px 24px', background: '#ffffff' }, [
    c('container', {}, { direction: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }, [
      c('heading', { text: brand, level: '4' }, { fontWeight: '800' }),
      c('container', {}, { direction: 'row', alignItems: 'center', gap: '24px' }, [
        c('container', {}, { direction: 'row', alignItems: 'center', gap: '24px' }, links.length
          ? links
          : [
              c('link', { text: 'Features', href: '#features' }, { color: 'inherit' }),
              c('link', { text: 'Pricing', href: '#pricing' }, { color: 'inherit' }),
              c('link', { text: 'Contact', href: '#contact' }, { color: 'inherit' }),
            ], { hideOn: 'mobile', name: 'Menu links' }),
        c('button', { text: cta, variant: 'primary' }, { padding: '8px 16px' }),
      ]),
    ]),
  ], { name: 'Navbar' })

export const hero = () =>
  c('section', {}, { padding: '96px 24px', background: 'linear-gradient(180deg, #eef2ff 0%, #ffffff 100%)' }, [
    c('container', {}, { alignItems: 'center', textAlign: 'center', gap: '20px' }, [
      c('text', { text: '✨ Build without code' }, {
        fontSize: '14px', fontWeight: '600', color: 'var(--nc-primary)', background: '#e0e7ff', padding: '6px 14px', borderRadius: '999px',
      }),
      c('heading', { text: 'Launch your next idea in minutes', level: '1' }, { maxWidth: '760px' }),
      c('text', { text: 'Drag, drop and publish. Everything you need to build beautiful websites and apps — no coding required.' }, {
        fontSize: '20px', color: MUTED, maxWidth: '620px',
      }),
      c('container', {}, { direction: 'row', gap: '12px', justifyContent: 'center', wrap: true }, [
        c('button', { text: 'Start for free', variant: 'primary' }),
        c('button', { text: 'Watch demo', variant: 'outline' }),
      ]),
    ]),
  ], { name: 'Hero' })

export const splitHero = () =>
  c('section', {}, { padding: '80px 24px' }, [
    c('row', {}, { alignItems: 'center', gap: '48px' }, [
      c('container', {}, { gap: '20px' }, [
        c('heading', { text: 'Your story, beautifully told', level: '1' }),
        c('text', { text: 'Combine text, images and calls to action into a page that converts. Change anything with a click.' }, { fontSize: '18px', color: MUTED }),
        c('container', {}, { direction: 'row', gap: '12px', wrap: true }, [
          c('button', { text: 'Get started' }),
          c('button', { text: 'Learn more', variant: 'ghost' }),
        ]),
      ]),
      c('image', { src: img('nocode-hero', 1200, 900), alt: 'Team working together' }, { borderRadius: '16px', height: '380px' }),
    ]),
  ], { name: 'Hero with image' })

const feature = (icon: string, title: string, body: string) =>
  c('card', {}, { gap: '10px' }, [
    c('text', { text: icon }, { fontSize: '28px' }),
    c('heading', { text: title, level: '4' }),
    c('text', { text: body }, { color: MUTED }),
  ])

export const features = () =>
  c('section', {}, {}, [
    c('container', {}, { alignItems: 'center', textAlign: 'center', gap: '12px', margin: '0 0 24px' }, [
      c('heading', { text: 'Everything you need', level: '2' }),
      c('text', { text: 'Powerful building blocks that work beautifully together.' }, { color: MUTED, fontSize: '18px' }),
    ]),
    c('row', {}, {}, [
      feature('⚡', 'Lightning fast', 'Pages load instantly and look great on every device.'),
      feature('🎨', 'Fully customizable', 'Fine-tune colors, fonts, spacing and layout visually.'),
      feature('🔌', 'Connect your data', 'Use variables, lists and APIs to build real apps.'),
    ]),
  ], { name: 'Features', anchor: 'features' })

const plan = (name: string, price: string, items: string, highlight = false) =>
  c('card', {}, highlight ? { borderWidth: '2px', borderColor: 'var(--nc-primary)', shadow: 'lg', gap: '16px' } : { gap: '16px' }, [
    c('heading', { text: name, level: '5' }, { color: highlight ? 'var(--nc-primary)' : MUTED }),
    c('heading', { text: price, level: '2' }),
    c('list', { items }, { color: MUTED }),
    c('button', { text: 'Choose plan', variant: highlight ? 'primary' : 'outline' }, { width: '100%' }),
  ])

export const pricing = () =>
  c('section', {}, { background: '#f9fafb' }, [
    c('container', {}, { alignItems: 'center', textAlign: 'center', gap: '12px', margin: '0 0 24px' }, [
      c('heading', { text: 'Simple, transparent pricing', level: '2' }),
      c('text', { text: 'Start free and upgrade as you grow.' }, { color: MUTED, fontSize: '18px' }),
    ]),
    c('row', {}, { alignItems: 'flex-start' }, [
      plan('Starter', '$0', '1 project\nCommunity support\nBasic components'),
      plan('Pro', '$19/mo', 'Unlimited projects\nPriority support\nCustom domains', true),
      plan('Team', '$49/mo', 'Everything in Pro\n5 team members\nShared workspaces'),
    ]),
  ], { name: 'Pricing', anchor: 'pricing' })

export const testimonial = () =>
  c('section', {}, {}, [
    c('card', {}, { maxWidth: '720px', margin: '0 auto', padding: '40px', alignItems: 'center', textAlign: 'center', gap: '20px' }, [
      c('text', { text: '“We rebuilt our whole website in an afternoon. Our team can finally make changes without waiting on developers.”' }, {
        fontSize: '22px', fontWeight: '500', lineHeight: '1.5',
      }),
      c('image', { src: img('nocode-avatar', 200, 200), alt: 'Customer photo' }, { width: '56px', height: '56px', borderRadius: '999px' }),
      c('text', { text: 'Jordan Lee · Head of Marketing' }, { color: MUTED, fontSize: '15px' }),
    ]),
  ], { name: 'Testimonial' })

export const cta = () =>
  c('section', {}, { background: 'var(--nc-primary)', color: '#ffffff' }, [
    c('container', {}, { alignItems: 'center', textAlign: 'center', gap: '16px' }, [
      c('heading', { text: 'Ready to get started?', level: '2' }),
      c('text', { text: 'Join thousands of makers building without code.' }, { fontSize: '18px', opacity: '0.9' }),
      c('button', { text: 'Create your site' }, { background: '#ffffff', color: 'var(--nc-primary)' }),
    ]),
  ], { name: 'Call to action' })

export const contactForm = () =>
  c('section', {}, {}, [
    c('container', {}, { maxWidth: '560px', margin: '0 auto', width: '100%', gap: '16px' }, [
      c('heading', { text: 'Get in touch', level: '2' }),
      c('text', { text: 'We usually reply within one business day.' }, { color: MUTED }),
      c('input', { label: 'Name', placeholder: 'Your name', bind: 'contactName' }),
      c('input', { label: 'Email', placeholder: 'you@example.com', inputType: 'email', bind: 'contactEmail' }),
      c('textarea', { label: 'Message', placeholder: 'How can we help?', bind: 'contactMessage' }),
      c('button', { text: 'Send message' }, {}, undefined, {
        events: {
          click: [
            { id: uid('a'), type: 'alert', message: 'Thanks {{contactName}}! We will reply to {{contactEmail}} soon.', condition: "contactEmail != ''" },
            { id: uid('a'), type: 'alert', message: 'Please enter your email address.', condition: "contactEmail == ''" },
          ],
        },
      }),
    ]),
  ], { name: 'Contact form', anchor: 'contact' })

const contactVariables = (): Variable[] => [
  { id: uid('v'), name: 'contactName', type: 'string', initial: '' },
  { id: uid('v'), name: 'contactEmail', type: 'string', initial: '' },
  { id: uid('v'), name: 'contactMessage', type: 'string', initial: '' },
]

export const faq = () =>
  c('section', {}, {}, [
    c('container', {}, { maxWidth: '760px', margin: '0 auto', width: '100%', gap: '24px' }, [
      c('heading', { text: 'Frequently asked questions', level: '2' }, { textAlign: 'center' }),
      ...[
        ['Do I need to know how to code?', 'Not at all. Everything is visual: drag components, click to edit and publish.'],
        ['Can I use my own domain?', 'Yes. Export your site as a single HTML file and host it anywhere.'],
        ['Is my work saved?', 'Your projects are saved automatically in your browser as you edit.'],
      ].map(([q, a]) =>
        c('container', {}, { gap: '6px' }, [c('heading', { text: q, level: '5' }), c('text', { text: a }, { color: MUTED })]),
      ),
    ]),
  ], { name: 'FAQ', anchor: 'faq' })

export const stats = () =>
  c('section', {}, { padding: '48px 24px' }, [
    c('row', {}, { textAlign: 'center' }, [
      ['10k+', 'Sites published'],
      ['99.9%', 'Uptime'],
      ['4.9/5', 'Average rating'],
    ].map(([value, label]) =>
      c('container', {}, { gap: '4px', alignItems: 'center' }, [
        c('heading', { text: value, level: '2' }, { color: 'var(--nc-primary)' }),
        c('text', { text: label }, { color: MUTED }),
      ]),
    )),
  ], { name: 'Stats' })

export const gallery = () =>
  c('section', {}, {}, [
    c('heading', { text: 'Gallery', level: '2' }, { textAlign: 'center' }),
    c('row', {}, { gap: '16px' }, [1, 2, 3].map((i) =>
      c('image', { src: img(`nocode-gallery-${i}`, 800, 600), alt: `Gallery image ${i}` }, { height: '220px', borderRadius: '12px' }),
    )),
  ], { name: 'Gallery' })

export const footer = (brand = 'Acme', links: NodeData[] = []) =>
  c('section', {}, { padding: '32px 24px', background: '#111827', color: '#9ca3af' }, [
    c('container', {}, { direction: 'row', justifyContent: 'space-between', alignItems: 'center', wrap: true, gap: '16px' }, [
      c('text', { text: `© ${new Date().getFullYear()} ${brand}. All rights reserved.` }, { fontSize: '14px' }),
      c('container', {}, { direction: 'row', gap: '20px' }, links.length
        ? links
        : [
            c('link', { text: 'Privacy', href: '#' }, { color: '#d1d5db', fontSize: '14px' }),
            c('link', { text: 'Terms', href: '#' }, { color: '#d1d5db', fontSize: '14px' }),
            c('link', { text: 'Contact', href: '#' }, { color: '#d1d5db', fontSize: '14px' }),
          ]),
    ]),
  ], { name: 'Footer' })

export const BLOCKS: Block[] = [
  { id: 'navbar', label: 'Navbar', description: 'Logo, menu and button', create: () => navbar() },
  { id: 'hero', label: 'Hero', description: 'Big headline with buttons', create: hero },
  { id: 'split-hero', label: 'Hero + image', description: 'Text beside a picture', create: splitHero },
  { id: 'features', label: 'Features', description: 'Three feature cards', create: features },
  { id: 'stats', label: 'Stats', description: 'Key numbers', create: stats },
  { id: 'pricing', label: 'Pricing', description: 'Three plans', create: pricing },
  { id: 'testimonial', label: 'Testimonial', description: 'Customer quote', create: testimonial },
  { id: 'gallery', label: 'Gallery', description: 'Row of images', create: gallery },
  { id: 'faq', label: 'FAQ', description: 'Questions and answers', create: faq },
  { id: 'contact', label: 'Contact form', description: 'Working form with variables', create: contactForm, variables: contactVariables },
  { id: 'cta', label: 'Call to action', description: 'Colored banner with button', create: cta },
  { id: 'footer', label: 'Footer', description: 'Copyright and links', create: () => footer() },
]
