import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

createApp({
  data() {
    return {
      myMessage: "",
      sending: false,
      currentChannel: null, // tracks current channel (null = home page)
      newChatName: "", // editable group chat name
      showChatForm: false, // toggles create chat form visibility

      editingMessage: null, // stores (url, editContent): the message being edited and edited content

      /* --- REDO RENAMING GROUP CHATS FUNCTIONALITY --- */

      renamingChat: null, // stores (channel, currentName, newName)
      nameObjects: [], // {name: 'My Group Chat', describes: 'my-group-chat-channel'}

      groupChatSchema: {
        properties: {
          value: {
            required: ["activity", "object"], // mark which properties are required
            properties: {
              // add properties here
              // make sure to specify the nested properties too
              activity: {
                const: "Create", // must exactly match "Create"
              },
              object: {
                required: ["type", "name", "channel"],
                properties: {
                  type: {
                    const: "Group Chat",
                  },
                  name: {
                    type: "string",
                  },
                  channel: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    };
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

    // method to enter a group chat
    enterGroupChat(channel) {
      console.log("Entering channel: ", channel);
      this.currentChannel = channel;
    },

    // method to exit a group chat (and return to home page)
    exitGroupChat() {
      console.log("Exiting channel: ", this.currentChannel);
      this.currentChannel = null;
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

    async createChat(session) {
      // trims whitespace to prevent empty/whitespace-only names
      if (!this.newChatName.trim()) return;
      this.sending = true;
      try {
        // create the "Create" object
        await this.$graffiti.put(
          {
            value: {
              activity: "Create",
              object: {
                type: "Group Chat",
                name: this.newChatName,
                channel: crypto.randomUUID(),
              },
            },
            channels: ["designftw"], // put these "Create" objects in the "designftw" channel
            allowed: undefined, // and make sure anyone can see it
          },
          session
        );
        // reset the form
        this.newChatName = "";
        this.showChatForm = false;
      } catch (error) {
        console.error("Error creating group chat: ", error);
      } finally {
        this.sending = false;
      }
    },

    startRenaming(chat) {
      const currentName = this.getCurrentChatName(chat);

      this.renamingChat = {
        channel: chat.value.object.channel,
        currentName: currentName,
        newName: chat.value.object.name,
      };
    },

    async saveRename(session) {
      if (!this.renamingChat) return;

      await this.$graffiti.put(
        {
          value: {
            name: this.renamingChat.newName,
            describes: this.renamingChat.channel,
          },
          channels: [this.renamingChat.channel],
          allowed: undefined,
        },
        session
      );
      this.cancelRename();
    },

    cancelRename() {
      this.renamingChat = null;
    },

    handleNameObjectsUpdate(objects) {
      this.nameObjects = objects;
    },

    getCurrentChatName(chat) {
      const nameObj = this.nameObjects
        .filter((obj) => obj.value.describes === chat.value.object.channel)
        .sort((a, b) => b.value.published - a.value.published)[0];

      let displayName = "";
      if (nameObj) displayName = nameObj.value.name;
      else displayName = chat.value.object.name;

      return displayName;
    },
  },
})
  .use(GraffitiPlugin, {
    graffiti: new GraffitiLocal(),
    // graffiti: new GraffitiRemote(),
  })
  .mount("#app");
