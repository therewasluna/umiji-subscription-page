import { Center, Progress } from '@mantine/core'

export function LoadingScreen({ height = '100%' }: { height?: string }) {
    return (
        <Center h={height}>
            <Progress animated maw="20rem" radius="xs" striped value={100} w="60%" />
        </Center>
    )
}
