from django.db import models

from . import utils
from .message import Message
from .user import User


class MessageRead(utils.CustomModel):
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, db_column="messageId", related_name="+"
    )
    recipient = models.ForeignKey(
        User, on_delete=models.CASCADE, db_column="recipientId", related_name="+"
    )

    hasBeenRead = models.BooleanField(null=False, db_column="hasBeenRead")
