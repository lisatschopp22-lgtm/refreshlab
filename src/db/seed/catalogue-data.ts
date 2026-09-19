import type { SpecField } from "@/db/schema/catalogue";
import type { Localized } from "@/db/schema/common";

export type CategorySeed = {
  slug: string;
  name: Localized;
  intro: Localized;
  icon: string;
  specs: SpecField[];
};

const n = (key: string, de: string, en: string, unit?: string, facet = false): SpecField => ({
  key,
  label: { de, en },
  type: "number",
  unit,
  facet,
});
const t = (key: string, de: string, en: string, facet = false): SpecField => ({
  key,
  label: { de, en },
  type: "text",
  facet,
});

export const categories: CategorySeed[] = [
  {
    slug: "zentrifugen",
    name: { de: "Zentrifugen", en: "Centrifuges" },
    intro: {
      de: "Tisch- und Standzentrifugen für Molekularbiologie, Zellkultur und Klinik. Rotor, Kühlung und Servicehistorie bestimmen den Wiederverkaufswert.",
      en: "Benchtop and floor centrifuges for molecular biology, cell culture and clinical work. Rotor, cooling and service history drive the resale value.",
    },
    icon: "centrifuge",
    specs: [
      n("max_rcf", "Max. RZB", "Max. RCF", "× g", true),
      n("max_rpm", "Max. Drehzahl", "Max. speed", "rpm"),
      t("cooling", "Kühlung", "Cooling", true),
      n("capacity_ml", "Kapazität", "Capacity", "ml"),
      t("rotor_type", "Rotortyp", "Rotor type", true),
    ],
  },
  {
    slug: "chromatographie",
    name: { de: "Chromatographie", en: "Chromatography" },
    intro: {
      de: "HPLC-, UHPLC-, FPLC- und GC-Systeme. Module lassen sich einzeln ersetzen, weshalb der Zustand jedes Moduls dokumentiert sein sollte.",
      en: "HPLC, UHPLC, FPLC and GC systems. Modules can be replaced individually, so each module's condition should be documented.",
    },
    icon: "chromatography",
    specs: [
      t("technique", "Technik", "Technique", true),
      n("max_pressure_bar", "Max. Druck", "Max. pressure", "bar", true),
      t("detector", "Detektor", "Detector", true),
      n("flow_max_ml_min", "Max. Fluss", "Max. flow", "ml/min"),
      t("software", "Software", "Software"),
    ],
  },
  {
    slug: "mikroskopie",
    name: { de: "Mikroskopie", en: "Microscopy" },
    intro: {
      de: "Durchlicht-, Fluoreszenz- und Stereomikroskope. Optik altert kaum, Elektronik und Kameras dagegen schon.",
      en: "Brightfield, fluorescence and stereo microscopes. Optics age slowly, electronics and cameras do not.",
    },
    icon: "microscope",
    specs: [
      t("microscope_type", "Bauart", "Type", true),
      t("illumination", "Beleuchtung", "Illumination", true),
      n("objectives", "Objektive", "Objectives", ""),
      t("camera", "Kamera", "Camera"),
      t("contrast", "Kontrastverfahren", "Contrast methods"),
    ],
  },
  {
    slug: "spektroskopie",
    name: { de: "Spektroskopie", en: "Spectroscopy" },
    intro: {
      de: "UV/Vis-, FTIR- und Fluoreszenzspektrometer sowie Plattenlesegeräte. Lampenstunden sind der wichtigste Verschleisswert.",
      en: "UV/Vis, FTIR and fluorescence spectrometers plus plate readers. Lamp hours are the key wear figure.",
    },
    icon: "spectrometer",
    specs: [
      t("technique", "Technik", "Technique", true),
      t("wavelength_range", "Wellenlängenbereich", "Wavelength range"),
      n("resolution_nm", "Auflösung", "Resolution", "nm"),
      t("detector", "Detektor", "Detector"),
      t("plate_formats", "Plattenformate", "Plate formats"),
    ],
  },
  {
    slug: "pcr-thermocycler",
    name: { de: "PCR & Thermocycler", en: "PCR & thermal cyclers" },
    intro: {
      de: "Konventionelle und Real-Time-Cycler. Blockhomogenität und Peltier-Zustand entscheiden über die Eignung für quantitative Arbeiten.",
      en: "Conventional and real-time cyclers. Block uniformity and Peltier condition decide whether a unit still suits quantitative work.",
    },
    icon: "pcr",
    specs: [
      t("cycler_type", "Bauart", "Type", true),
      n("block_format", "Blockformat", "Block format", "Wells", true),
      n("channels", "Detektionskanäle", "Detection channels", ""),
      n("ramp_rate", "Heizrate", "Ramp rate", "°C/s"),
      t("gradient", "Gradient", "Gradient"),
    ],
  },
  {
    slug: "kuehlung-lagerung",
    name: { de: "Kühlung & Lagerung", en: "Cooling & storage" },
    intro: {
      de: "Ultratiefkühlschränke, Laborkühlschränke und Gefriergeräte. Kompressorstunden und Dichtungen sind die kritischen Punkte.",
      en: "Ultra-low temperature freezers, laboratory fridges and freezers. Compressor hours and seals are the critical points.",
    },
    icon: "freezer",
    specs: [
      n("min_temp_c", "Min. Temperatur", "Min. temperature", "°C", true),
      n("volume_l", "Nutzvolumen", "Usable volume", "l", true),
      t("cooling_type", "Kühlsystem", "Cooling system"),
      n("power_w", "Leistungsaufnahme", "Power draw", "W"),
      t("alarm", "Alarmsystem", "Alarm system"),
    ],
  },
  {
    slug: "inkubatoren-schuettler",
    name: { de: "Inkubatoren & Schüttler", en: "Incubators & shakers" },
    intro: {
      de: "CO2-Inkubatoren, Trockenschränke und Schüttelinkubatoren. Sensorkalibrierung und Dekontaminationsnachweis sind beim Gebrauchtkauf entscheidend.",
      en: "CO2 incubators, drying ovens and shaking incubators. Sensor calibration and a decontamination record matter most when buying used.",
    },
    icon: "incubator",
    specs: [
      t("incubator_type", "Bauart", "Type", true),
      n("volume_l", "Volumen", "Volume", "l", true),
      n("max_temp_c", "Max. Temperatur", "Max. temperature", "°C"),
      t("co2_control", "CO2-Regelung", "CO2 control", true),
      t("decontamination", "Dekontamination", "Decontamination"),
    ],
  },
  {
    slug: "waagen",
    name: { de: "Waagen", en: "Balances" },
    intro: {
      de: "Analysen-, Präzisions- und Mikrowaagen. Eine gültige Kalibrierung erhöht den Verkaufspreis deutlich.",
      en: "Analytical, precision and micro balances. A valid calibration noticeably raises the selling price.",
    },
    icon: "balance",
    specs: [
      n("readability_mg", "Ablesbarkeit", "Readability", "mg", true),
      n("capacity_g", "Höchstlast", "Capacity", "g", true),
      t("calibration", "Kalibrierung", "Calibration", true),
      t("draft_shield", "Windschutz", "Draft shield"),
      t("interfaces", "Schnittstellen", "Interfaces"),
    ],
  },
  {
    slug: "liquid-handling",
    name: { de: "Pipetten & Liquid Handling", en: "Pipettes & liquid handling" },
    intro: {
      de: "Manuelle und elektronische Pipetten sowie Pipettierroboter. Bei Automaten zählt die Verfügbarkeit von Software-Lizenzen.",
      en: "Manual and electronic pipettes plus liquid handling robots. For automated systems, software licence availability is decisive.",
    },
    icon: "pipette",
    specs: [
      t("handling_type", "Bauart", "Type", true),
      n("channels", "Kanäle", "Channels", "", true),
      t("volume_range", "Volumenbereich", "Volume range"),
      t("deck_positions", "Deckpositionen", "Deck positions"),
      t("software", "Software", "Software"),
    ],
  },
  {
    slug: "sterilisation",
    name: { de: "Sterilisation & Autoklaven", en: "Sterilisation & autoclaves" },
    intro: {
      de: "Autoklaven und Sterilisatoren. Druckbehälterprüfung und Dokumentation sind gesetzlich relevant und müssen vorliegen.",
      en: "Autoclaves and sterilisers. Pressure vessel inspection and documentation are legally relevant and must be present.",
    },
    icon: "autoclave",
    specs: [
      n("chamber_l", "Kammervolumen", "Chamber volume", "l", true),
      n("max_temp_c", "Max. Temperatur", "Max. temperature", "°C"),
      t("vacuum", "Vakuumverfahren", "Vacuum process", true),
      t("documentation", "Dokumentation", "Documentation"),
      t("pressure_test", "Druckprüfung", "Pressure test"),
    ],
  },
  {
    slug: "zellkultur",
    name: { de: "Zellkultur & Sicherheitswerkbänke", en: "Cell culture & safety cabinets" },
    intro: {
      de: "Sicherheitswerkbänke und Laminar-Flow-Einheiten. Ohne aktuelle Filterprüfung ist ein Gerät praktisch unverkäuflich.",
      en: "Biological safety cabinets and laminar flow units. Without a current filter test a unit is practically unsellable.",
    },
    icon: "cabinet",
    specs: [
      t("safety_class", "Sicherheitsklasse", "Safety class", true),
      n("width_cm", "Arbeitsbreite", "Working width", "cm", true),
      t("filter", "Filter", "Filter"),
      t("last_filter_test", "Letzte Filterprüfung", "Last filter test"),
      t("uv_lamp", "UV-Lampe", "UV lamp"),
    ],
  },
  {
    slug: "probenvorbereitung",
    name: { de: "Probenvorbereitung", en: "Sample preparation" },
    intro: {
      de: "Rotationsverdampfer, Homogenisatoren, Mühlen und Ultraschallgeräte. Verschleissteile sind meist günstig nachzurüsten.",
      en: "Rotary evaporators, homogenisers, mills and sonicators. Wear parts are usually cheap to replace.",
    },
    icon: "evaporator",
    specs: [
      t("prep_type", "Bauart", "Type", true),
      n("volume_l", "Volumen", "Volume", "l"),
      n("power_w", "Leistung", "Power", "W"),
      t("control", "Steuerung", "Control"),
      t("accessories_included", "Zubehör", "Accessories"),
    ],
  },
];

export type ManufacturerSeed = { name: string; slug: string; country: string; website: string };

export const manufacturers: ManufacturerSeed[] = [
  { name: "Eppendorf", slug: "eppendorf", country: "DE", website: "https://www.eppendorf.com" },
  { name: "Thermo Fisher Scientific", slug: "thermo-fisher", country: "US", website: "https://www.thermofisher.com" },
  { name: "Agilent Technologies", slug: "agilent", country: "US", website: "https://www.agilent.com" },
  { name: "Sartorius", slug: "sartorius", country: "DE", website: "https://www.sartorius.com" },
  { name: "Mettler Toledo", slug: "mettler-toledo", country: "CH", website: "https://www.mt.com" },
  { name: "Beckman Coulter", slug: "beckman-coulter", country: "US", website: "https://www.beckman.com" },
  { name: "Cytiva", slug: "cytiva", country: "SE", website: "https://www.cytivalifesciences.com" },
  { name: "Waters", slug: "waters", country: "US", website: "https://www.waters.com" },
  { name: "Shimadzu", slug: "shimadzu", country: "JP", website: "https://www.shimadzu.com" },
  { name: "Andreas Hettich", slug: "hettich", country: "DE", website: "https://www.hettichlab.com" },
  { name: "Binder", slug: "binder", country: "DE", website: "https://www.binder-world.com" },
  { name: "Büchi", slug: "buechi", country: "CH", website: "https://www.buchi.com" },
  { name: "Leica Microsystems", slug: "leica", country: "DE", website: "https://www.leica-microsystems.com" },
  { name: "Carl Zeiss", slug: "zeiss", country: "DE", website: "https://www.zeiss.com" },
  { name: "Bio-Rad", slug: "bio-rad", country: "US", website: "https://www.bio-rad.com" },
];
