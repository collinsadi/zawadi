export type EscrowChallenge = {
  id: number;
  title: string;
  totalPrize: string;
  token: string;
  isERC20: boolean;
  ipfsCid: string;
  isFunded: boolean;
  sponsor: string;
  data: {
    image: string;
    details: string;
    brief: string;
  };
  sponsorMeta: {
    link: string;
    name: string;
    logo: string;
  };
};

export type EscrowApproval = {
  sponsorApproved: boolean;
  organiserApproved: boolean;
};
