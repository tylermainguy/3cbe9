import React, { useCallback, useEffect, useState, useContext } from "react";
import axios from "axios";
import moment from "moment";
import { useHistory } from "react-router-dom";
import { Grid, CssBaseline, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

import { SidebarContainer } from "../components/Sidebar";
import { ActiveChat } from "../components/ActiveChat";
import { SocketContext } from "../context/socket";

const useStyles = makeStyles((theme) => ({
  root: {
    height: "100vh",
  },
}));

const Home = ({ user, logout }) => {
  const history = useHistory();

  const socket = useContext(SocketContext);

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);

  const classes = useStyles();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addSearchedUsers = (users) => {
    const currentUsers = {};

    // make table of current users so we can lookup faster
    conversations.forEach((convo) => {
      currentUsers[convo.otherUser.id] = true;
    });

    const newState = [...conversations];
    users.forEach((user) => {
      // only create a fake convo if we don't already have a convo with this user
      if (!currentUsers[user.id]) {
        let fakeConvo = { otherUser: user, messages: [], messagesRead: [], numUnread: 0};
        newState.push(fakeConvo);
      }
    });

    setConversations(newState);
  };

  const clearSearchedUsers = () => {
    setConversations((prev) => prev.filter((convo) => convo.id));
  };

  const saveMessage = async (body) => {
    const { data } = await axios.post("/api/messages", body);
    return data;
  };

  const sendMessage = (data, body) => {
    socket.emit("new-message", {
      message: data.message,
      messageRead: data.messageRead,
      recipientId: body.recipientId,
      sender: data.sender,
    });
  };

  const postMessage = async (body) => {
    try {
      const data = await saveMessage(body);

      if (!body.conversationId) {
        addNewConvo(body.recipientId, data.message);
      } else {
        await addMessageToConversation(data);
      }

      sendMessage(data, body);
    } catch (error) {
      console.error(error);
    }
  };

  const addNewConvo = useCallback(
    (recipientId, message) => {
      setConversations((prev) => {
        return prev.map((convo) => {
          if (convo.otherUser.id === recipientId) {
            const convoCopy = {...convo};
            convoCopy.messages = [...convoCopy.messages, message];
            convoCopy.latestMessageText = message.text;
            convoCopy.id = message.conversationId;
            return convoCopy;
          } else {
            return convo;
          }
        });
      })
    },
    [setConversations],
  );

  const addMessageToConversation = useCallback(
    async (data) => {
      const { message, messageRead, sender = null } = data;
      if (sender !== null) {
        const newConvo = {
          id: message.conversationId,
          otherUser: sender,
          messages: [],
          messagesRead: [],
          numUnread: 0,
        };
        setConversations((prev) => [newConvo, ...prev]);
      }

      if (user.id !== message.senderId) {
        // if active conversation and username is equal to active conversation
        const senderConvo = conversations.find(
          (convo) => convo.id === message.conversationId
        );
        const isActive =
          activeConversation &&
          senderConvo &&
          senderConvo.otherUser.username === activeConversation
            ? true
            : false;

        messageRead.hasBeenRead = isActive;

        if (isActive) {
          const reqBody = {
            updatedMessages: [messageRead],
          };
          await axios.put("/api/messagesRead", reqBody);
        }

        // update conversations with new read message
        setConversations((prev) => {
          return prev.map((convo) => {
            if (convo.id === message.conversationId) {
              const convoCopy = { ...convo };
              convoCopy.numUnread = isActive ? 0 : convoCopy.numUnread + 1;
              convoCopy.messagesRead = [...convoCopy.messagesRead, messageRead];
              return convoCopy;
            }
            return convo;
          });
        });
      }
      setConversations((prev) => {
        return prev.map((convo) => {
          if (convo.id === message.conversationId) {
            const convoCopy = { ...convo };
            convoCopy.messages = [...convoCopy.messages, message];
            convoCopy.latestMessageText = message.text;
            return convoCopy;
          } else {
            return convo;
          }
        });
      });
    },
    [setConversations, activeConversation, user, conversations]
  );

  const setActiveChat = async (username) => {
    setActiveConversation(username);

    // check if there's an existing conversation
    const activeConv = conversations
      ? conversations.find(
          (conversation) => conversation.otherUser.username === username
        )
      : {};

    // if conversation exists
    if (
      activeConv !== {} &&
      activeConv !== undefined &&
      activeConv.messages.length > 0
    ) {
      // get all messages that need to be updated
      let updatedMessages = activeConv["messagesRead"].filter((message) => {
        return !message.hasBeenRead;
      });

      const reqBody = {
        updatedMessages,
      };
      await axios.put("/api/messagesRead", reqBody);

      // update the current conversation
      setConversations((prev) => {
        return prev.map((convo) => {
          if (convo.otherUser.username === username) {
            const convoCopy = { ...convo };
            convoCopy.numUnread = 0;
            let messagesRead = [...convoCopy.messagesRead];
            messagesRead.forEach((message) => {
              message.hasBeenRead = true;
            });
            convoCopy.messagesRead = messagesRead;
            return convoCopy;
          }
          return convo;
        });
      });
    }
  };

  const addOnlineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: true };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  const removeOfflineUser = useCallback((id) => {
    setConversations((prev) =>
      prev.map((convo) => {
        if (convo.otherUser.id === id) {
          const convoCopy = { ...convo };
          convoCopy.otherUser = { ...convoCopy.otherUser, online: false };
          return convoCopy;
        } else {
          return convo;
        }
      }),
    );
  }, []);

  // Lifecycle

  useEffect(() => {
    // Socket init
    socket.on("add-online-user", addOnlineUser);
    socket.on("remove-offline-user", removeOfflineUser);
    socket.on("new-message", addMessageToConversation);

    return () => {
      // before the component is destroyed
      // unbind all event handlers used in this component
      socket.off("add-online-user", addOnlineUser);
      socket.off("remove-offline-user", removeOfflineUser);
      socket.off("new-message", addMessageToConversation);
    };
  }, [addMessageToConversation, addOnlineUser, removeOfflineUser, socket]);

  useEffect(() => {
    // when fetching, prevent redirect
    if (user?.isFetching) return;

    if (user && user.id) {
      setIsLoggedIn(true);
    } else {
      // If we were previously logged in, redirect to login instead of register
      if (isLoggedIn) history.push("/login");
      else history.push("/register");
    }
  }, [user, history, isLoggedIn]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data } = await axios.get("/api/conversations");
        // sort messages for each conversation
        const sortedData = data.map((convo) => {
          convo.messages.sort((a, b) => (moment(a.createdAt).isSameOrAfter(b.createdAt) ? 1 : -1))
          return convo;
        });

        setConversations(sortedData);
      } catch (error) {
        console.error(error);
      }
    };
    if (!user.isFetching) {
      fetchConversations();
    }
  }, [user]);

  const handleLogout = async () => {
    if (user && user.id) {
      await logout(user.id);
    }
  };

  return (
    <>
      <Button onClick={handleLogout}>Logout</Button>
      <Grid container component="main" className={classes.root}>
        <CssBaseline />
        <SidebarContainer
          conversations={conversations}
          user={user}
          clearSearchedUsers={clearSearchedUsers}
          addSearchedUsers={addSearchedUsers}
          setActiveChat={setActiveChat}
        />
        <ActiveChat
          activeConversation={activeConversation}
          conversations={conversations}
          user={user}
          postMessage={postMessage}
        />
      </Grid>
    </>
  );
};

export default Home;
