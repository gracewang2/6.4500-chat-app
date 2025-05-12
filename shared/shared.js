// shared functionality between Chat and Learn modes

// this doesn't work: Profile discovery failed: o.map is not a function. (In 'o.map(encodeURIComponent)', 'o.map' is undefined)
export const getProfile = async (actorURL, graffiti) => {
  try {
    // discover profiles in the public channel that describe this actor
    // API: graffiti.discover(channels: string[], schema: Schema, session?: null | GraffitiSession)
    const iterator = graffiti.discover(["public-profiles"], {
      properties: {
        name: { type: "string" },
        bio: { type: "string" },
        picture: { type: "string" },
      },
    });

    for await (const result of iterator) {
      if (result.object.actor === actorURL) {
        console.log("Result of graffiti.discover: ", result);
        console.log("Result.value of graffiti.discover: ", result.object.value);
        return { data: result.object.value, url: result.object.url };
      }
    }
  } catch (error) {
    console.error("Profile discovery failed:", error);
    return { data: null, url: null };
  }
};

// put is for adding new data, so patch should be used here instead (if modifying)
// change "public-profiles" (development) to "new-public-profiles" (final)
export const saveProfile = async (profileData, session, graffiti) => {
  const actorURL = session.actor;
  try {
    // first, try to get the existing profile
    console.log("session.actor:", session.actor);

    // ERROR: Failed to save profile: GraffitiErrorUnrecognizedUriScheme: Unrecognized URL Scheme: [object Object]
    const { data: existingProfile, url: profileURL } = await getProfile(
      actorURL,
      graffiti
    );
    if (existingProfile !== null && existingProfile !== undefined) {
      // profile exists, so use PATCH to update
      console.log("There exists an existing user with this name!");
      console.log("Existing profile: ", existingProfile);
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
        profileURL, // ??
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
