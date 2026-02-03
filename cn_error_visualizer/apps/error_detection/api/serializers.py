from rest_framework import serializers

class ErrorDetectionRequestSerializer(serializers.Serializer):
    TECHNIQUE_CHOICES = [
        ('vrc', 'VRC'),
        ('lrc', 'LRC'),
        ('crc', 'CRC'),
        ('checksum', 'Checksum'),
    ]
    
    technique = serializers.ChoiceField(choices=TECHNIQUE_CHOICES)
    data = serializers.RegexField(regex=r'^[01]+$', error_messages={'invalid': 'Data must contain only 0s and 1s.'})
    generator = serializers.RegexField(regex=r'^[01]+$', required=False, default="1001", help_text="Required for CRC")
    introduce_error = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        if attrs['technique'] == 'crc' and not attrs.get('generator'):
            raise serializers.ValidationError({"generator": "Generator polynomial is required for CRC."})
        return attrs
