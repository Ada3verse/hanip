export interface ConceptDependency {
  id: string;
  prerequisites: string[];
  recommendedAfter: string[];
  bridgeQuestion: string;
  bridgeExplanation: string;
}

export type DependencyResult = {
  missingPrerequisite: string;
  bridgeQuestion: string;
  bridgeExplanation: string;
};

