from django.contrib.auth.middleware import get_user
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from messenger_backend.models import Conversation, Message, MessageRead
from online_users import online_users
from rest_framework.request import Request
from rest_framework.views import APIView


class MessagesRead(APIView):
    def put(self, request: Request):
        try:
            user = get_user(request)

            if user.is_anonymous:
                return HttpResponse(status=401)

            body = request.data
            conversation_id = body.get("conversationId")

            conversation = Conversation.objects.get(id=conversation_id)

            if user.id != conversation.user1_id and user.id != conversation.user2_id:
                return HttpResponse(status=403)

            unread_messages = MessageRead.objects.filter(
                Q(conversation=conversation) & Q(hasBeenRead=False) & Q(recipientId=user.id)
            )

            for unread_message in unread_messages.all():
                unread_message.hasBeenRead = True
                unread_message.save()

            return HttpResponse(status=204)

        except Exception as e:
            return HttpResponse(status=500)
