from django.contrib.auth.middleware import get_user
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
            updated_messages = body.get("updatedMessages")

            # update messages to be read
            for message in updated_messages:
                dbMessage = MessageRead.objects.get(id=message["id"])
                dbMessage.hasBeenRead = True
                dbMessage.save()

            return HttpResponse(status=201)

        except Exception as e:
            return HttpResponse(status=500)
