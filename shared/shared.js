import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

// export const graffiti = new GraffitiLocal();
export const graffiti = new GraffitiRemote();

export const getProfile = async (actorURL, graffiti) => {
  const profile = await graffiti.get({ url: actorURL });
  if (profile) return profile.value;
  return null;
};

// put is for adding new data, so patch should be used here instead (if modifying)
// change "public-profiles" (development) to "new-public-profiles" (final)
export const saveProfile = async (profileData, session, graffiti) => {
  await graffiti.put(
    {
      value: {
        name: profileData.name || "Anonymous",
        bio: profileData.bio || "",
        picture: profileData.picture || "../assets/default-profile-pic.png",
        updated: Date.now(),
        generator:
          "https://gracewang2.github.io/6.4500-chat-app/chat/chat.html",
        describes: session.actor,
      },
      channels: [session.actor, "public-profiles", "designftw-2025-studio2"], // store in the user's own channel + public channel
    },
    session
  );
  console.log("Profile saved successfully");
};
