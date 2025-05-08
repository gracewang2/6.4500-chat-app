import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

// export const graffiti = new GraffitiLocal();
export const graffiti = new GraffitiRemote();

// this isn't the "real" actorURL
export const getActorURL = (actorId) =>
  `https://gracewang2.github.io/6.4500-chat-app/actors/${actorId}`;

export const getProfile = async (actorURL, graffiti) => {
  const profile = await graffiti.get({ url: actorURL });
  if (profile) return profile.value;
  return null;
};

// put is for adding new data, so patch should be used here instead (if modifying)
// change "public-profiles" (development) to "new-public-profiles" (final)
export const saveProfile = async (profileData, session, graffiti) => {
  const actorURL = getActorURL(session.actor);
  console.log("actorURL: ", actorURL);
  try {
    // first, try to get the existing profile
    console.log("session.actor:", session.actor);

    // ERROR: Failed to save profile: GraffitiErrorUnrecognizedUriScheme: Unrecognized URL Scheme: [object Object]
    const existingProfile = await graffiti.get({ url: actorURL });
    if (existingProfile) {
      // profile exists, so use PATCH to update
      console.log("There exists an existing user with this name!");
      await graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/name",
              value: profileData.name || "Anonymous",
            },
            {
              op: "replace",
              path: "/bio",
              value: profileData.bio || "",
            },
            {
              op: "replace",
              path: "/picture",
              value: profileData.picture || "../assets/default-profile-pic.png",
            },
            {
              op: "replace",
              path: "/updated",
              value: Date.now(),
            },
          ],
        },
        undefined, // ??
        session
      );
      console.log("Profile saved successfully");
    } else {
      console.log("There does NOT exist an existing user with this name!");
      await graffiti.put(
        {
          // no profile exists, so use PUT to create
          value: {
            name: profileData.name || "Anonymous",
            bio: profileData.bio || "",
            picture: profileData.picture || "../assets/default-profile-pic.png",
            updated: Date.now(),
            generator:
              "https://gracewang2.github.io/6.4500-chat-app/chat/chat.html",
            describes: actorURL,
          },
          channels: [actorURL, "public-profiles", "designftw-2025-studio2"], // store in the user's own channel + public channel
        },
        session
      );
    }
    console.log("Profile created successfully");
  } catch (error) {
    console.error("Failed to save profile: ", error);
    return false;
  }
};
