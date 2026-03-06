import { Timestamp } from "firebase/firestore"
import { User } from "@/models/authentication"

export const USER_MOCK: User = {
  uid: "user123",
  login: "userlogin",
  password: "securepassword123",
  firstname: "Ritchi",
  lastname: "Glenn",
  birthDate: "1995-05-12",
  email: "ritchi.glenn@example.com",
  country: {
    name: "Gabon",
    code: "GA"
  },
  phoneNumbers: ["+24101234567"],
  image: "https://example.com/profile.jpg",
  notificationParameter: {
    isNew: true,
    isAccountActivity: true,
    isNewAnnouncement: true,
    isFavoris: true,
    isPersonalizedSuggestions: true,
    isSystemUpdated: true
  },
  searchableName: "Ritchi Glenn",
  createdAt: Timestamp.fromDate(new Date("2023-01-01")),
  updatedAt: Timestamp.fromDate(new Date("2024-01-01")),
  state: "IN_PROGRESS",
  roles: ["Announcer"],
  emailVerified: true,
  providers: ["GOOGLE"],
  metadata: {
    idToken: "fake-id-token",
    accessToken: "fake-access-token"
  },
  favoris: ["property1", "property2"],
  credits: 3
}
