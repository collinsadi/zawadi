import { IHackathon } from "../../models/Hackathon";

export type Relationship = "organiser" | "sponsor" | "winner";

export interface RelatedHackathon extends IHackathon {
  relationships: Relationship[];
}
