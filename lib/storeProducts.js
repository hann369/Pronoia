// lib/storeProducts.js
// Single source of truth for the physical store catalogue. Used by the Life OS
// Ecosystem Store tab (components/lifeos/StoreTab.js) and the standalone public
// store page (app/store/page.js). Product `id`s must match the server-side price
// map in lib/stripe.js (priceIdForProduct).

/* Baut die Bildergalerie für eine Seife. `detailFile` deckt den Tippfehler
 * "Soap Detal.png" bei der Rose-Variante ab. Erstes Bild = Karten-/Warenkorb-Bild. */
const soapImages = (prefix, detailFile = 'Soap Detail') => [
  { src: `/graphic assets/${prefix} - Front.png`, label: 'Vorderseite' },
  { src: `/graphic assets/${prefix} - Side.png`, label: 'Seite' },
  { src: `/graphic assets/${prefix} - Back.png`, label: 'Rückseite' },
  { src: `/graphic assets/${prefix} - Top.png`, label: 'Oben' },
  { src: `/graphic assets/${prefix} - Bottom.png`, label: 'Unten' },
  { src: `/graphic assets/${prefix} - Soap.png`, label: 'Seife' },
  { src: `/graphic assets/${prefix} - ${detailFile}.png`, label: 'Seifen-Detail' },
  { src: `/graphic assets/${prefix} - Box Detail.png`, label: 'Verpackung' },
];

/* Leinen-/Baumwoll-Handtuch: 9 durchnummerierte Mockups. Erstes Bild = Karten-/Warenkorb-Bild. */
const towelImages = Array.from({ length: 9 }, (_, i) => ({
  src: `/graphic assets/Linen Towel ${i + 1}.png`,
  label: `Ansicht ${i + 1}`,
}));

const IMG_PX = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAL8Zu9p6RdMx4q8WYiKftxKf3qLUacHc1gW4bNiAtAcK-o7h333h6XpW_vDlWzihUsR6Ur8aoEi2NsoHFIqiTF_BvlJIgRZabcbxDDjaBtANxnX-xcwiAdKTX_oxw3dJrERD1edC5_rIDucBjInFci-_D7NPlDV_3yY-vtIVW7AgbeM3I14esFzqixas1lroyr_ol6nGX1W-Cdq6CkYqNI6MZp-WsO7gDAxxzSLra0Jrf1Atarrq6bfKiPV5yENY3nRXv3pBsuodYT';
const IMG_TOWEL = towelImages[0].src;
const IMG_SOAP_ROSE = '/graphic assets/Soap Rose - Front.png';
const IMG_SOAP_BREEZE = '/graphic assets/Soap Breeze - Front.png';
const IMG_SOAP_MEADOW = '/graphic assets/Soap Meadow - Front.png';

export const PRODUCTS = [
  { id: 'px_v1', name: 'PX-V1 Nootropic Matrix', price: 45, category: 'Stacks', image: IMG_PX,
    desc: 'Kognitive Matrix für Fokus und neuronale Plastizität. Optimiert für maximale Performance.',
    benefits: ['Gesteigerte Konzentration über 8h+', 'Reduzierter mentaler Fog', 'Verbesserte Gedächtnisleistung'],
    usage: 'Täglich 2 Kapseln morgens auf nüchternen Magen. 5 Tage einnehmen, 2 Tage Pause für Rezeptorsensibilität.',
    ingredients: [['Alpha-GPC', '300mg'], ['Bacopa Monnieri', '450mg'], ['L-Theanine', '200mg']] },
  { id: 'linen_towel', name: 'Ritual Handtuch — Leinen & Baumwolle', price: 39, category: 'Rituals', image: IMG_TOWEL,
    images: towelImages,
    desc: 'Weiches Leinen-Baumwoll-Handtuch für deine Reinigungs- und Pflegerituale. Schnelltrocknend, saugstark und mit jeder Wäsche weicher.',
    benefits: ['Atmungsaktives Leinen-Baumwoll-Gewebe', 'Saugstark & schnelltrocknend', 'Nachhaltig gefertigt'],
    usage: 'Bei 30°C waschen, lufttrocknen für maximale Langlebigkeit des Gewebes.',
    ingredients: [['Leinen', '55%'], ['Bio-Baumwolle', '45%']] },
  { id: 'soap_rose', name: 'Rose — Alepposeife mit Rosenduft', price: 15, category: 'Rituals', image: IMG_SOAP_ROSE,
    images: soapImages('Soap Rose', 'Soap Detal'),
    desc: 'Traditionelle Oliven- und Lorbeerölseife, veredelt mit Rosenduft. Handgeschöpft und langgereift für ein blühendes Reinigungsritual.',
    benefits: ['Antike Rezeptur mit Rosenduft', 'Haut-Regeneration', 'Handgeschöpft & langgereift'],
    usage: 'Täglich für Reinigungsrituale. Zwischen den Anwendungen trocken lagern.',
    ingredients: [['Olivenöl', '70%'], ['Lorbeeröl', '20%'], ['Rosenextrakt', '5%'], ['Lauge', '5%']] },
  { id: 'soap_breeze', name: 'Breeze — Alepposeife mit Meersalz', price: 15, category: 'Rituals', image: IMG_SOAP_BREEZE,
    images: soapImages('Soap Breeze'),
    desc: 'Traditionelle Oliven- und Lorbeerölseife mit Meersalz. Handgeschöpft und langgereift für ein klärendes, mineralisches Reinigungsritual.',
    benefits: ['Antike Rezeptur mit Meersalz', 'Klärend & mineralisch', 'Handgeschöpft & langgereift'],
    usage: 'Täglich für Reinigungsrituale. Zwischen den Anwendungen trocken lagern.',
    ingredients: [['Olivenöl', '70%'], ['Lorbeeröl', '20%'], ['Meersalz', '5%'], ['Lauge', '5%']] },
  { id: 'soap_meadow', name: 'Meadow — Alepposeife', price: 15, category: 'Rituals', image: IMG_SOAP_MEADOW,
    images: soapImages('Soap Meadow'),
    desc: 'Traditionelle Oliven- und Lorbeerölseife in ihrer reinen Form. Handgeschöpft und langgereift für das ursprüngliche Reinigungsritual.',
    benefits: ['Antike Rezeptur', 'Haut-Regeneration', 'Handgeschöpft & langgereift'],
    usage: 'Täglich für Reinigungsrituale. Zwischen den Anwendungen trocken lagern.',
    ingredients: [['Olivenöl', '75%'], ['Lorbeeröl', '20%'], ['Lauge', '5%']] },
];
