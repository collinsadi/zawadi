export type Hackathon = {
  id: string;
  title: string;
  cover: string;
  description: string;
  details: {
    prizePool: string;
    currency: string;
    startDate: string; // ISO string
    endDate: string; // ISO string
    location: string;
    tags: string[];
  };
  organiser: {
    name: string;
    logo: string;
    url: string;
  };
  type: "Online" | "In-person";
};
