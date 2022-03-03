from messenger_backend.models import Conversation, Message, MessageRead, User
from rest_framework import status
from rest_framework.test import APITestCase


class ReadMessagesTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        test_user_1 = User(
            username="test1",
            email="test1@email.com",
            password="123456",
        )

        test_user_1.save()

        test_user_2 = User(
            username="test2",
            email="test2@email.com",
            password="123456",
        )
        test_user_2.save()

        test_conversation = Conversation(user1=test_user_1, user2=test_user_2)
        test_conversation.save()

        messages = Message(
            conversation=test_conversation, senderId=test_user_1.id, text="Where are you from?"
        )
        messages.save()

        messagesRead = MessageRead(
            message=messages,
            recipientId=test_user_2.id,
            hasBeenRead=False,
            conversation=test_conversation,
        )

        messagesRead.save()

    def setUp(self):
        self.user_one_data = {"username": "test1", "password": "123456"}
        self.user_two_data = {"username": "test2", "password": "123456"}

        self.setup_token(self.user_one_data)
        self.setup_token(self.user_two_data)

        self.message = {
            "text": "test message",
            "recipientId": self.user_two_data["id"],
            "conversation": {},
            "hasBeenRead": False,
            "sender": None,
        }

    def setup_token(self, user_data):
        # Register a user
        register_response = self.client.post("/auth/login", data=user_data, format="json")
        self.assertEqual(register_response.status_code, status.HTTP_200_OK)

        data = register_response.json()
        self.assertIn("token", data)
        self.assertIn("id", data)

        user_data["token"] = data.get("token")
        user_data["id"] = data.get("id")

        print("user id: {}".format(data.get("id")))

    def post_message(self, message, user_data):
        # Access protected route with credentials
        users_response = self.client.post(
            f"/api/messages",
            format="json",
            data=message,
            **{"HTTP_X-ACCESS-TOKEN": user_data["token"]},
        )

        return users_response

    def test_post_message(self):
        """Send message between two users and check for message read status"""

        users_response = self.post_message(self.message, self.user_one_data)

        self.assertEqual(users_response.status_code, status.HTTP_200_OK)

        data = users_response.json()

        self.assertIn("messageRead", data)
        message_read = data["messageRead"]

        self.assertEqual(message_read["recipientId"], 2)
        self.assertEqual(message_read["hasBeenRead"], False)

    def test_has_unread_messages(self):
        conversations_response = self.client.get(
            f"/api/conversations",
            format="json",
            **{"HTTP_X-ACCESS-TOKEN": self.user_two_data["token"]},
        )

        self.assertEqual(conversations_response.status_code, status.HTTP_200_OK)

        data = conversations_response.json()[0]

        self.assertIn("messagesRead", data)

        messages_read = data["messagesRead"][0]

        self.assertEqual(messages_read["recipientId"], self.user_two_data["id"])

    def test_update_message_read_status(self):

        conversations_response = self.client.get(
            f"/api/conversations",
            format="json",
            **{"HTTP_X-ACCESS-TOKEN": self.user_two_data["token"]},
        )

        self.assertEqual(conversations_response.status_code, status.HTTP_200_OK)

        data = conversations_response.json()[0]

        self.assertIn("messagesRead", data)

        messages_read = data["messagesRead"][0]

        messages_read["hasBeenRead"] = True

        messages_read = [messages_read]

        data = {"updatedMessages": messages_read}

        messages_read_response = self.client.put(
            f"/api/messagesRead",
            format="json",
            data=data,
            **{"HTTP_X-ACCESS-TOKEN": self.user_two_data["token"]},
        )

        self.assertEqual(messages_read_response.status_code, status.HTTP_201_CREATED)
