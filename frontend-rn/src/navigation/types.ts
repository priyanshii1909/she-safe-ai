// SHE SAFE AI — Navigation Type Definitions

export type RootStackParamList = {
  Home: undefined;
  AIChat: undefined;
  SOS: undefined;
  SafeRoute:
    | {
        destination?: {
          id: string;
          name: string;
          lat: number;
          lng: number;
        };
      }
    | undefined;
  Journey: undefined;
  SafetyMap: undefined;
  Contacts: undefined;
  HelpMeSayIt: { situation: string };
  SafetyPlan: { situation: string };
};
