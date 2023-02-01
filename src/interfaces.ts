type Usage = "rec used" | "no rec used" | "not used promise";

export interface INewResource {
  user_id: string;
  title: string;
  link: string;
  description: string;
  tags: string[];
  type: string;
  usage: Usage;
}
