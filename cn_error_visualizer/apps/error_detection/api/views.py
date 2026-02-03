from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import ErrorDetectionRequestSerializer
from ..services.algorithm_factory import AlgorithmFactory

class DetectErrorView(APIView):
    def post(self, request):
        serializer = ErrorDetectionRequestSerializer(data=request.data)
        if serializer.is_valid():
            params = serializer.validated_data
            try:
                result = AlgorithmFactory.run_algorithm(
                    technique=params['technique'],
                    data=params['data'],
                    generator=params.get('generator'),
                    introduce_error=params['introduce_error']
                )
                return Response(result, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
