/**
 * The two catalog concepts every organization has, with the wording each one
 * can customise: services (what the organization delivers or runs) and tools
 * (what it uses to do so). A school might call them "Programs" and
 * "Equipment & software"; defaults apply wherever nothing is set.
 */
export interface ConceptTerms {
  singular: string;
  plural: string;
  /** One line explaining what belongs here, shown under the page heading. */
  description: string;
}

export interface Terminology {
  services: ConceptTerms;
  tools: ConceptTerms;
}

export const DEFAULT_TERMINOLOGY: Terminology = {
  services: {
    singular: "Service",
    plural: "Services",
    description: "What your organization delivers or runs.",
  },
  tools: {
    singular: "Tool",
    plural: "Tools",
    description: "What your organization uses to do its work.",
  },
};

export interface TerminologyColumns {
  servicesLabelSingular?: string | null;
  servicesLabelPlural?: string | null;
  servicesDescription?: string | null;
  toolsLabelSingular?: string | null;
  toolsLabelPlural?: string | null;
  toolsDescription?: string | null;
}

function pick(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/** Fills any unset wording from the defaults. */
export function resolveTerminology(
  columns: TerminologyColumns | null | undefined,
): Terminology {
  const d = DEFAULT_TERMINOLOGY;
  return {
    services: {
      singular: pick(columns?.servicesLabelSingular, d.services.singular),
      plural: pick(columns?.servicesLabelPlural, d.services.plural),
      description: pick(columns?.servicesDescription, d.services.description),
    },
    tools: {
      singular: pick(columns?.toolsLabelSingular, d.tools.singular),
      plural: pick(columns?.toolsLabelPlural, d.tools.plural),
      description: pick(columns?.toolsDescription, d.tools.description),
    },
  };
}

/** Lower-cases a label for use mid-sentence ("No programs yet"). */
export function lowerLabel(label: string): string {
  return label.toLowerCase();
}
