export type SurfaceReason = string;

export type MustflowTarget =
	| {
			readonly kind: 'path';
			readonly path: string;
			readonly lineStart?: number;
	  }
	| {
			readonly kind: 'document';
			readonly path: string;
	  }
	| {
			readonly kind: 'source_anchor';
			readonly id: string;
			readonly path: string;
			readonly lineStart: number;
	  }
	| {
			readonly kind: 'command_intent';
			readonly intent: string;
	  };

export interface SurfaceSummary {
	readonly kind: string;
	readonly category: string;
	readonly isPublicSurface: boolean;
}

export interface SurfaceDecisionAuthority {
	readonly canInstructAgent: boolean;
	readonly canGrantCommandPermission: boolean;
	readonly canSelectVerification: boolean;
}

export interface SurfaceDecision {
	readonly target: MustflowTarget;
	readonly changeKinds?: readonly string[];
	readonly surface?: SurfaceSummary;
	readonly reasons: readonly SurfaceReason[];
	readonly affectedContracts?: readonly string[];
	readonly driftChecks?: readonly string[];
	readonly risk?: readonly string[];
	readonly authority: SurfaceDecisionAuthority;
}

export const CHANGE_CLASSIFICATION_SURFACE_AUTHORITY: SurfaceDecisionAuthority = {
	canInstructAgent: false,
	canGrantCommandPermission: false,
	canSelectVerification: true,
};

export const DOCUMENT_REVIEW_SURFACE_AUTHORITY: SurfaceDecisionAuthority = {
	canInstructAgent: false,
	canGrantCommandPermission: false,
	canSelectVerification: false,
};

export const SOURCE_ANCHOR_SURFACE_AUTHORITY: SurfaceDecisionAuthority = {
	canInstructAgent: false,
	canGrantCommandPermission: false,
	canSelectVerification: false,
};

export function createPathTarget(path: string, lineStart?: number): MustflowTarget {
	return lineStart === undefined ? { kind: 'path', path } : { kind: 'path', path, lineStart };
}
