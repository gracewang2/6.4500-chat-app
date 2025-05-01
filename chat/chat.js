import { createApp } from "vue";
import { graffiti } from "../shared/shared.js";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

/** components */
import ProfileSummary from "../shared/ProfileSummary.js";

const app = createApp({
  data() {
    return {
      /** messaging */
      myMessage: "",
      sending: false,
      currentChannel: null, // tracks current channel (null = home page)

      /** editing messages */
      editingMessage: null, // stores (url, editContent): the message being edited and edited content

      /** profile information */
      profile: { name: "", bio: "", picture: "" },

      /** chats */
      chats: [], // {channel: string, time: number, name: string}
      showCreateChatModal: false,
      userSearchQuery: "",
      searchResults: [],

      /** profile modal + active tab */
      activeTab: "Chat", // "Chat" or "Learn"
      showProfileMenu: false,
      showProfileModal: false,

      /** creating new DM */
      showCreateChatModal: false,
    };
  },

  async created() {
    // on startup, load current user's profile
    if (this.$graffitiSession.value) {
      this.profile = await getProfile(
        this.$graffitiSession.value.actor,
        this.$graffiti
      );
      this.addUser(this.$graffitiSession.value.actor);
    }
  },

  methods: {
    async sendMessage(session) {
      if (!this.myMessage || !this.currentChannel) return; // Disable the send button when the message text is empty

      this.sending = true;

      // Essentially does the same thing as this.sentMessageObjects.push()
      // but instead of adding your message to the local sentMessageObjects array,
      // it adds it to a shared "channel" specified in the channels variable.
      try {
        await this.$graffiti.put(
          {
            value: {
              content: this.myMessage,
              published: Date.now(),
            },
            channels: [this.currentChannel],
          },
          session
        );
      } catch (error) {
        console.log("Failed to send message: ", error);
      }

      this.sending = false;
      this.myMessage = ""; // Clear the message once it has been sent

      // Refocus the input field after sending the message
      await this.$nextTick();
      this.$refs.messageInput.focus();
    },

    // save the edited message
    async saveEdit(session) {
      if (!this.editingMessage) return;
      await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/content",
              value: this.editingMessage.content,
            },
          ],
        },
        { url: this.editingMessage.url },
        session
      );
      this.cancelEdit();
    },

    async deleteMessage(message, session) {
      if (confirm("Are you sure you want to delete this message?")) {
        try {
          await this.$graffiti.delete(message, session);
        } catch (error) {
          console.error("Failed to delete message: ", error);
        }
      }
    },

    // starting editing a message
    startEditing(message) {
      this.editingMessage = {
        url: message.url,
        content: message.value.content,
      };
    },

    cancelEdit() {
      this.editingMessage = null;
    },

    async updateProfile() {
      await saveProfile(
        // implemented in shared.js
        this.profile,
        this.$graffitiSession.value,
        this.$graffiti
      );
    },

    // set default profile pic
    setDefaultPic() {
      this.profile.picture = "/assets/default-profile-pic.png";
    },

    // switch to "Chat" or "Learn"
    switchTab(tab) {
      this.activeTab = tab;
    },

    handlePictureUpload(event) {
      // TODO
    },

    toggleProfileMenu() {
      this.showProfileMenu = !this.showProfileMenu;
      this.showProfileModal = false;
    },

    openProfileModal() {
      this.showProfileMenu = false;
      this.showProfileModal = true;
    },

    filterProfiles(profiles) {
      return profiles.filter((profile) =>
        profile.value.name
          .toLowerCase()
          .includes(this.userSearchQuery.toLowerCase())
      );
    },

    startChat(actorURL) {
      const actors = [this.$graffitiSession.value.actor, actorURL].sort(); // me + recipient
      const newChat = {
        channel: actors.join("-"),
        time: Date.now(),
        name: this.searchResults.find((u) => u.actor === actorURL).profile.name,
      };

      this.chats.unshift(newChat); // add to top of list
      this.currentChannel = newChat.channel;
      this.showCreateChatModal = false;
    },
  },

  computed: {
    sortedChats() {
      return this.chats.sort((a, b) => b.time - a.time);
    },
  },
}).use(GraffitiPlugin, { graffiti });

app.component("profile-summary", ProfileSummary);
console.log(app.component("profile-summary"));
app.mount("#app");
